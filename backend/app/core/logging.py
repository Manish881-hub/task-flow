"""Structured JSON logging with request ID."""
from __future__ import annotations

import json
import logging
import sys
import uuid

from fastapi import Request


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level": record.levelname.lower(),
            "msg": record.getMessage(),
            "logger": record.name,
        }
        for key in ("request_id", "method", "path", "status", "duration_ms", "extra"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        if record.exc_info and record.exc_info[0] is not None:
            payload["exc"] = self.formatException(record.exc_info).splitlines()[-1:]
        return json.dumps(payload)


_handler = logging.StreamHandler(sys.stdout)
_handler.setFormatter(JsonFormatter())
logger = logging.getLogger("taskflow")
logger.handlers = [_handler]
logger.setLevel(logging.INFO)
logger.propagate = False


async def request_id_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex[:12]
    request.state.request_id = request_id
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response
