from fastapi.testclient import TestClient

from app.auth.verify_token import require_valid_token
from app.main import app

client = TestClient(app)


def test_whoami_requires_a_bearer_token() -> None:
    response = client.get("/internal/whoami")
    assert response.status_code == 401  # HTTPBearer rejects missing credentials


def test_whoami_returns_claims_for_a_valid_token() -> None:
    app.dependency_overrides[require_valid_token] = lambda: {
        "sub": "assistant-service-worker",
        "scope": "services-api",
    }
    try:
        response = client.get("/internal/whoami", headers={"Authorization": "Bearer fake"})
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"client_id": "assistant-service-worker", "scope": "services-api"}
