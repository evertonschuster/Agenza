import httpx
import pytest

from app.auth.config import IdentityConfig
from app.auth.service_token_client import ServiceTokenClient


def _config() -> IdentityConfig:
    return IdentityConfig(
        authority="http://identity-service:8080",
        issuer="http://identity-service:8080",
        audience="services-api",
        client_id="assistant-service-worker",
        client_secret="secret",
        scope="services-api",
    )


def _patch_transport(monkeypatch: pytest.MonkeyPatch, handler) -> None:
    import app.auth.service_token_client as module

    original_async_client = httpx.AsyncClient

    class PatchedAsyncClient(original_async_client):  # type: ignore[misc]
        def __init__(self, *args, **kwargs) -> None:  # type: ignore[no-untyped-def]
            kwargs["transport"] = httpx.MockTransport(handler)
            super().__init__(*args, **kwargs)

    monkeypatch.setattr(module.httpx, "AsyncClient", PatchedAsyncClient)


@pytest.mark.asyncio
async def test_get_access_token_requests_client_credentials_grant(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests_seen: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests_seen.append(request)
        return httpx.Response(200, json={"access_token": "token-abc", "expires_in": 3600})

    _patch_transport(monkeypatch, handler)

    client = ServiceTokenClient(_config())
    token = await client.get_access_token()

    assert token == "token-abc"
    assert len(requests_seen) == 1
    body = requests_seen[0].content.decode()
    assert "grant_type=client_credentials" in body
    assert "client_id=assistant-service-worker" in body


@pytest.mark.asyncio
async def test_get_access_token_reuses_cached_token_until_expiry(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    call_count = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal call_count
        call_count += 1
        return httpx.Response(200, json={"access_token": f"token-{call_count}", "expires_in": 3600})

    _patch_transport(monkeypatch, handler)

    client = ServiceTokenClient(_config())
    first = await client.get_access_token()
    second = await client.get_access_token()

    assert first == second == "token-1"
    assert call_count == 1
