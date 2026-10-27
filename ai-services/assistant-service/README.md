# assistant-service

FastAPI service boundary. [app/main.py](app/main.py) implements process health, identity readiness
and an authenticated tenant-context probe. It does not implement the AI receptionist or an LLM
workflow.

## Local development

The supported stack starts through [Aspire](../../backend/README.md#commands), which injects the
identity environment defined in [AppHost](../../backend/AppHost/AppHost.cs).

For focused work in this service, use the Python pin in [.python-version](.python-version) and the
uv installation pin in the [AI workflow](../../.github/workflows/ai-services-ci.yml), then run here:

```powershell
uv sync --frozen --extra dev
uv run ruff check app tests
uv run ruff format --check app tests
uv run pytest
```

For an isolated diagnostic process, `uv run uvicorn app.main:app --reload --port 8001` starts this
service only; identity-dependent routes still need a reachable identity-service and matching
environment. Use [config.py](app/auth/config.py) for the variable names and
[AppHost](../../backend/AppHost/AppHost.cs) for the wired values. The issuer must match the token's
`iss`, including its trailing slash; the authority is the address used to reach identity-service.

[pyproject.toml](pyproject.toml) and [uv.lock](uv.lock) own dependencies and test configuration.
Do not add a parallel requirements file.

## Authentication and tenant boundary

- [require_valid_token](app/auth/verify_token.py) validates inbound bearer tokens against JWKS,
  issuer and audience.
- [require_tenant_context](app/auth/tenant_context.py) rejects missing, malformed or mismatched
  UUID tenant claim/header values and exposes the validated context to tenant-owned routes.
- [ServiceTokenClient](app/auth/service_token_client.py) obtains and caches a client-credentials
  token. That tenant-free identity is for explicit control-plane calls, not tenant data.
- [ADR 0022](../../docs/adr/0022-ai-tenant-context-and-delegation.md) defines delegation for
  tenant-owned outbound calls and explicit identity for background work; the probe does not
  implement those business flows.

`/health` checks process liveness. `/ready` checks reachability of the configured JWKS endpoint,
not complete token validation. `/internal/whoami` requires the inbound token/tenant boundary and
returns its context; it is not proof of outbound delegation or business authorization.

The [tests](tests/) and [CI](../../.github/workflows/ai-services-ci.yml) provide the current evidence.
The runtime smoke checks health; token/tenant cases and coverage have their own scope.
