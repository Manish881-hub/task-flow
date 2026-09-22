"""Typed error hierarchy + global handler. Never leak stack traces."""
from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    def __init__(self, message: str, code: str, status_code: int, details: object = None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class NotFoundError(AppError):
    def __init__(self, resource: str = "Resource", details: object = None):
        super().__init__(f"{resource} not found", "NOT_FOUND", 404, details)


class ValidationError(AppError):
    def __init__(self, message: str = "Validation failed", details: object = None):
        super().__init__(message, "VALIDATION_ERROR", 422, details)


class UnauthorizedError(AppError):
    def __init__(self, message: str = "Unauthorized", details: object = None):
        super().__init__(message, "UNAUTHORIZED", 401, details)


class ForbiddenError(AppError):
    def __init__(self, message: str = "Forbidden", details: object = None):
        super().__init__(message, "FORBIDDEN", 403, details)


class ConflictError(AppError):
    def __init__(self, message: str = "Conflict", details: object = None):
        super().__init__(message, "CONFLICT", 409, details)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {"code": exc.code, "message": exc.message, "details": exc.details},
            "request_id": request_id,
        },
    )


async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    return JSONResponse(
        status_code=500,
        content={
            "error": {"code": "INTERNAL_ERROR", "message": "Internal server error", "details": None},
            "request_id": request_id,
        },
    )
