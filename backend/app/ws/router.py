"""WS /ws?token=<JWT>: validate like Bearer, close 4401 if invalid."""
from __future__ import annotations

import uuid

import jwt
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import decode_access_token
from app.db import session as dbsession
from app.features.projects import repository as prepo
from app.ws.manager import manager

router = APIRouter()


@router.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    token = ws.query_params.get("token", "")
    try:
        user_id = decode_access_token(token)
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
        await ws.close(code=4401)
        return
    await manager.connect(ws, user_id)
    try:
        while True:
            msg = await ws.receive_json()
            if not isinstance(msg, dict) or msg.get("action") != "join":
                continue
            project_id = str(msg.get("project_id", ""))
            try:
                pid = uuid.UUID(project_id)
                uid = uuid.UUID(user_id)
            except ValueError:
                continue
            db = dbsession.SessionLocal()
            try:
                ok = prepo.get_membership(db, pid, uid) is not None
            finally:
                db.close()
            if not ok:
                try:
                    await ws.send_json({"type": "error", "message": "Not a member"})
                except Exception:
                    pass
                continue
            await manager.join(ws, user_id, project_id)
    except WebSocketDisconnect:
        manager.disconnect(ws, user_id)
    except Exception:
        manager.disconnect(ws, user_id)
        try:
            await ws.close()
        except Exception:
            pass
