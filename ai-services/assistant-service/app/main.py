from typing import Annotated

import httpx
from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse

from app.auth.config import load_identity_config
from app.auth.tenant_context import TenantContext, require_tenant_context

app = FastAPI(title="Assistant Service")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


async def identity_is_ready() -> bool:
    config = load_identity_config()
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            response = await client.get(f"{config.authority}/.well-known/jwks")
        return response.is_success
    except httpx.HTTPError:
        return False


@app.get("/ready")
async def ready() -> JSONResponse:
    if await identity_is_ready():
        return JSONResponse(status_code=200, content={"status": "ready"})

    return JSONResponse(
        status_code=503,
        content={"status": "unavailable", "dependency": "identity-service"},
    )


@app.get("/internal/whoami")
def whoami(
    tenant: Annotated[TenantContext, Depends(require_tenant_context)],
) -> dict[str, str | None]:
    """Executable probe for the authenticated, tenant-scoped boundary."""
    return {
        "client_id": tenant.subject,
        "scope": tenant.scope,
        "tenant_id": str(tenant.tenant_id),
    }
