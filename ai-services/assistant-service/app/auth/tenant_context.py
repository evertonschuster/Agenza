from dataclasses import dataclass
from typing import Annotated, Any
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status

from .verify_token import require_valid_token

TENANT_HEADER_NAME = "X-Tenant-Id"
TENANT_CLAIM_NAME = "tenant_id"


@dataclass(frozen=True)
class TenantContext:
    """Identity values validated at the HTTP boundary."""

    tenant_id: UUID
    subject: str | None
    scope: str | None


def _forbid_tenant_context() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "code": "invalid_tenant_context",
            "message": ("A valid tenant_id claim and matching X-Tenant-Id header are required."),
        },
    )


def require_tenant_context(
    claims: Annotated[dict[str, Any], Depends(require_valid_token)],
    tenant_header: Annotated[str | None, Header(alias=TENANT_HEADER_NAME)] = None,
) -> TenantContext:
    """Builds the only tenant value application code is allowed to trust."""

    claim_value = claims.get(TENANT_CLAIM_NAME)

    try:
        claim_tenant_id = UUID(str(claim_value))
        header_tenant_id = UUID(tenant_header or "")
    except (TypeError, ValueError, AttributeError) as error:
        raise _forbid_tenant_context() from error

    if claim_tenant_id != header_tenant_id:
        raise _forbid_tenant_context()

    return TenantContext(
        tenant_id=claim_tenant_id,
        subject=claims.get("sub"),
        scope=claims.get("scope"),
    )
