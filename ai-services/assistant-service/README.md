# assistant-service

FastAPI boundary for future AI receptionist capabilities. The current service
implements health/readiness probes and an authenticated tenant-context probe;
it does not yet implement conversational or model behavior.

## Local development

Prefer the repository AppHost for the full stack. For isolated service work:

```bash
uv sync --frozen --extra dev
uv run uvicorn app.main:app --reload --port 8001
uv run pytest
```

## Identity and tenant boundary

- Inbound bearer tokens are validated against identity-service JWKS.
- Tenant-owned endpoints require a UUID `tenant_id` claim matching
  `X-Tenant-Id` and depend on the validated `TenantContext` value.
- Tenant-owned outbound calls delegate the caller token and validated tenant
  header.
- Client-credentials tokens are reserved for explicitly tenant-free control
  plane work. Background tenant work needs a tenant-bound job identity.

Configuration keys:

- `IDENTITY_AUTHORITY`
- `IDENTITY_ISSUER`
- `IDENTITY_AUDIENCE`
- `IDENTITY_CLIENT_ID`
- `IDENTITY_CLIENT_SECRET`
- `IDENTITY_SCOPE`

AppHost injects local values. `pyproject.toml` and `uv.lock` are the dependency
sources; do not add a parallel `requirements.txt`.
