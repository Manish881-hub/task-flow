"""App entrypoint: lifespan, CORS, security headers, errors, health/ready."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.core.config import settings
from app.core.errors import AppError, app_error_handler, unhandled_error_handler
from app.core.logging import logger, request_id_middleware
from app.core.middleware import security_headers_middleware
from app.db.base import Base
from app.db.session import get_db, init_engine
from app.features.auth.router import limiter as auth_limiter
from app.features.auth.router import router as auth_router
from app.features.dashboard.router import router as dashboard_router
from app.features.projects.router import router as projects_router
from app.features.tasks.router import router as tasks_router
from app.ws.router import router as ws_router

# Import models so metadata is populated (alembic + create_all need this).
import app.db.models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_engine(settings.DATABASE_URL)
    from app.db.session import engine

    # Dev fallback: create tables if missing. Prod should use Alembic.
    Base.metadata.create_all(bind=engine)
    logger.info("startup complete", extra={"extra": {"env": settings.ENV}})
    yield
    try:
        if engine is not None:
            engine.dispose()
    except Exception:
        pass
    logger.info("shutdown complete", extra={"extra": {}})


def create_app() -> FastAPI:
    app = FastAPI(title="TaskFlow", lifespan=lifespan)

    app.middleware("http")(request_id_middleware)
    app.middleware("http")(security_headers_middleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Rate limiting (slowapi) for /api/v1/auth/*
    app.state.limiter = auth_limiter

    async def _rate_limit_handler(request, exc: RateLimitExceeded):
        request_id = getattr(request.state, "request_id", None)
        return JSONResponse(
            status_code=429,
            content={
                "error": {"code": "RATE_LIMITED", "message": "Too many requests", "details": None},
                "request_id": request_id,
            },
        )

    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
    app.add_exception_handler(AppError, app_error_handler)
    app.add_exception_handler(Exception, unhandled_error_handler)

    async def _validation_handler(request, exc: RequestValidationError):
        request_id = getattr(request.state, "request_id", None)
        details = [
            {"loc": list(e.get("loc", [])), "msg": str(e.get("msg")), "type": str(e.get("type"))}
            for e in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "error": {"code": "VALIDATION_ERROR", "message": "Validation failed", "details": details},
                "request_id": request_id,
            },
        )

    app.add_exception_handler(RequestValidationError, _validation_handler)

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.get("/ready")
    def ready():
        try:
            db = next(get_db())
            try:
                db.execute(text("SELECT 1"))
            finally:
                db.close()
            return {"status": "ok", "checks": {"database": "ok"}}
        except Exception:
            return JSONResponse(status_code=503, content={"status": "degraded", "checks": {"database": "error"}})

    app.include_router(auth_router)
    app.include_router(projects_router)
    app.include_router(tasks_router)
    app.include_router(dashboard_router)
    app.include_router(ws_router)
    return app


app = create_app()
