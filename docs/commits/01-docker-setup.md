# Session 01 — Docker setup

Commit: `Add gitignore and Docker setup`

## Changes
- `.gitignore` — Python, Node, Postgres volume, OS/IDE patterns
- `docker-compose.yml` — `db` (Postgres 16), `backend` (:8000), `frontend` (:3000)
- `backend/Dockerfile` — Python 3.12 slim, `pip install`, uvicorn
- `frontend/Dockerfile` — Node 20 multi-stage build + production runner
- `.github/workflows/ci.yml` — backend pytest + frontend build jobs

## Why
Reproducible production run (`docker compose up --build`) and CI gate before any
app code lands. Infra first so later commits build on a known-good base.

## Skills applied
- miniMAX fullstack-dev: health-gated `depends_on`, env-driven config, `.env.example` (no secrets)
- ECC coding-standards: explicit ports, restart policies, no hardcoded secrets

## Verify
- `docker compose config` — valid
- `git status --short` — only the 5 infra paths + this note staged
