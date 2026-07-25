# assistant-service

Python AI/ML service boundary (FastAPI). Only health endpoints and the
`/internal/whoami` boundary probe exist; feature behavior should be added only when
an AI use case is defined.

## Local development

```bash
python -m venv .venv
.venv\Scripts\Activate.ps1   # Windows
pip install uv==0.11.15
uv sync --frozen --extra dev
uv run uvicorn app.main:app --reload --port 8001
uv run pytest
```

## Authentication and tenant boundary

`app/auth/` integrates this service with identity-service:

- `ServiceTokenClient` acquires and caches a `client_credentials` token only
  for tenant-free control-plane calls. It must not be used to read tenant data.
- `require_valid_token` validates inbound bearer tokens against
  identity-service's JWKS endpoint.
- `require_tenant_context` fails closed unless the token's UUID `tenant_id`
  claim exactly matches the `X-Tenant-Id` header. Tenant-owned routes depend
  on this boundary value rather than parsing claims or headers themselves.
- Tenant-owned outbound calls delegate the caller's token and validated
  tenant header. Background work needs an explicit tenant-scoped job identity.

`/internal/whoami` exercises the complete tenant boundary.

Authentication is configured through `IDENTITY_AUTHORITY`, `IDENTITY_ISSUER`,
`IDENTITY_AUDIENCE`, `IDENTITY_CLIENT_ID`, `IDENTITY_CLIENT_SECRET`, and
`IDENTITY_SCOPE`; the demo values live in `infra/docker-compose.yml`.

`pyproject.toml` and `uv.lock` are the single dependency source for local
development, CI, and the Python 3.12 container image. Do not add a separate
hand-maintained `requirements.txt`.
