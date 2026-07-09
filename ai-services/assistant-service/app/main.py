from typing import Annotated, Any

from fastapi import Depends, FastAPI

from app.auth.verify_token import require_valid_token

app = FastAPI(title="Assistant Service")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/internal/whoami")
def whoami(
    claims: Annotated[dict[str, Any], Depends(require_valid_token)],
) -> dict[str, Any]:
    """Demonstrates inbound M2M validation: any caller must present a
    valid access token from identity-service (e.g. a services-service ->
    assistant-service call, or vice versa)."""
    return {"client_id": claims.get("sub"), "scope": claims.get("scope")}
