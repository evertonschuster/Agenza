import httpx
import pytest
from app.main import app


async def test_health() -> None:
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.parametrize(
    ("dependency_ready", "expected_status", "expected_body"),
    [
        (True, 200, {"status": "ready"}),
        (
            False,
            503,
            {"status": "unavailable", "dependency": "identity-service"},
        ),
    ],
)
async def test_readiness_reflects_identity_dependency(
    monkeypatch: pytest.MonkeyPatch,
    dependency_ready: bool,
    expected_status: int,
    expected_body: dict[str, str],
) -> None:
    async def fake_identity_is_ready() -> bool:
        return dependency_ready

    monkeypatch.setattr("app.main.identity_is_ready", fake_identity_is_ready)

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.get("/ready")

    assert response.status_code == expected_status
    assert response.json() == expected_body
