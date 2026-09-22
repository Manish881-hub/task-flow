"""In-memory WebSocket manager: project rooms + per-user sockets. No global broadcast."""
from __future__ import annotations

import json
from collections import defaultdict

from fastapi import WebSocket


def _sendable(message: dict) -> str:
    # datetime/UUID payloads are common — stdlib json would raise TypeError.
    return json.dumps(message, default=str)


class ConnectionManager:
    def __init__(self) -> None:
        self.rooms: dict[str, set[WebSocket]] = defaultdict(set)
        self.users: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, ws: WebSocket, user_id: str) -> None:
        await ws.accept()
        self.users[user_id].add(ws)

    def disconnect(self, ws: WebSocket, user_id: str) -> None:
        if ws in self.users.get(user_id, set()):
            self.users[user_id].discard(ws)
        for room in self.rooms.values():
            room.discard(ws)

    async def join(self, ws: WebSocket, user_id: str, project_id: str) -> None:
        self.rooms[project_id].add(ws)
        try:
            await ws.send_text(_sendable({"type": "joined", "project_id": project_id}))
        except Exception:
            pass

    async def broadcast_to_project(self, project_id: str, message: dict) -> None:
        text = _sendable(message)
        dead = []
        for ws in list(self.rooms.get(project_id, set())):
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            for room in self.rooms.values():
                room.discard(ws)

    async def send_to_user(self, user_id: str, message: dict) -> None:
        text = _sendable(message)
        for ws in list(self.users.get(user_id, set())):
            try:
                await ws.send_text(text)
            except Exception:
                pass


manager = ConnectionManager()
