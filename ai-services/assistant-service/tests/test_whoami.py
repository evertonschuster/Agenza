from uuid import uuid4

import httpx
from app.auth.verify_token import require_valid_token
from app.main import app


async def test_whoami_requires_a_bearer_token() -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/internal/whoami")
    assert response.status_code == 401  # HTTPBearer rejects missing credentials


async def test_whoami_returns_claims_for_a_valid_token() -> None:
    tenant_id = uuid4()
    app.dependency_overrides[require_valid_token] = lambda: {
        "sub": "assistant-service-worker",
        "scope": "services-api",
        "tenant_id": str(tenant_id),
    }
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get(
                "/internal/whoami",
                headers={
                    "Authorization": "Bearer fake",
                    "X-Tenant-Id": str(tenant_id),
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {
        "client_id": "assistant-service-worker",
        "scope": "services-api",
        "tenant_id": str(tenant_id),
    }


async def test_whoami_rejects_missing_tenant_header() -> None:
    tenant_id = uuid4()
    app.dependency_overrides[require_valid_token] = lambda: {
        "sub": "user",
        "tenant_id": str(tenant_id),
    }
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get(
                "/internal/whoami",
                headers={"Authorization": "Bearer fake"},
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "invalid_tenant_context"


async def test_whoami_rejects_missing_tenant_claim() -> None:
    app.dependency_overrides[require_valid_token] = lambda: {"sub": "user"}
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get(
                "/internal/whoami",
                headers={
                    "Authorization": "Bearer fake",
                    "X-Tenant-Id": str(uuid4()),
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403


async def test_whoami_rejects_mismatched_tenant() -> None:
    app.dependency_overrides[require_valid_token] = lambda: {
        "sub": "user",
        "tenant_id": str(uuid4()),
    }
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get(
                "/internal/whoami",
                headers={
                    "Authorization": "Bearer fake",
                    "X-Tenant-Id": str(uuid4()),
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403


async def test_whoami_rejects_malformed_tenant_values() -> None:
    app.dependency_overrides[require_valid_token] = lambda: {
        "sub": "user",
        "tenant_id": "not-a-uuid",
    }
    try:
        async with httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://test",
        ) as client:
            response = await client.get(
                "/internal/whoami",
                headers={
                    "Authorization": "Bearer fake",
                    "X-Tenant-Id": "also-not-a-uuid",
                },
            )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 403
