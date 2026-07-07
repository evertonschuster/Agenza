# assistant-service

Placeholder Python AI/ML service (FastAPI). Only a `/health` endpoint and a demo
`/internal/whoami` endpoint exist — flesh out once actual AI feature requirements are
defined (e.g. inbox reply drafting, appointment insights).

## Local dev

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows
pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8001
pytest
```

## Auth (M2M via identity-service)

`app/auth/` wires this worker up to identity-service:

- `ServiceTokenClient` — acquires and caches a `client_credentials` access token for
  **outbound** calls this worker makes to other backend services.
- `require_valid_token` (FastAPI dependency) — validates **inbound** bearer tokens
  against identity-service's JWKS endpoint, for requests made to this service.
  `/internal/whoami` demonstrates it.

Configured via env vars (set in `infra/docker-compose.yml`): `IDENTITY_AUTHORITY`,
`IDENTITY_AUDIENCE`, `IDENTITY_CLIENT_ID`, `IDENTITY_CLIENT_SECRET`, `IDENTITY_SCOPE`.
