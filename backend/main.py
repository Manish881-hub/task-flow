"""Vercel service entrypoint shim (deployment-only).

Vercel's Python/FastAPI runtime resolves a service's ``entrypoint`` as a
top-level ``module:variable`` relative to the service ``root`` (``backend/``).
All documented services examples use ``main:app`` with ``main.py`` at the
service root. The real application lives in ``backend/app/main.py`` (module
``app.main``, used locally via ``uvicorn app.main:app`` with ``WORKDIR /code``
== ``backend/``).

This file re-exports that same object so ``main:app`` (service-root relative)
and ``app.main:app`` resolve to the identical FastAPI instance. No application
logic lives here; do not add routes, middleware, or auth behavior.
"""

from app.main import app

__all__ = ["app"]
