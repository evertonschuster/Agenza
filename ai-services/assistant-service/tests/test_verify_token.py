import jwt
import pytest
from fastapi import HTTPException

from app.auth.config import IdentityConfig
from app.auth.verify_token import TokenValidator


def _config() -> IdentityConfig:
    return IdentityConfig(
        authority="http://identity-service:8080",
        issuer="http://identity-service:8080",
        audience="services-api",
        client_id="assistant-service-worker",
        client_secret="secret",
        scope="services-api",
    )


class _FakeSigningKey:
    key = "fake-key"


class _FakeJwkClient:
    def get_signing_key_from_jwt(self, token: str) -> _FakeSigningKey:
        return _FakeSigningKey()


def test_validate_returns_claims_for_a_valid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    validator = TokenValidator(_config())
    validator._jwk_client = _FakeJwkClient()  # noqa: SLF001

    monkeypatch.setattr(
        jwt,
        "decode",
        lambda token, key, algorithms, audience, issuer: {"sub": "worker", "scope": "services-api"},
    )

    claims = validator.validate("any-token")

    assert claims == {"sub": "worker", "scope": "services-api"}


def test_validate_raises_401_for_an_invalid_token(monkeypatch: pytest.MonkeyPatch) -> None:
    validator = TokenValidator(_config())
    validator._jwk_client = _FakeJwkClient()  # noqa: SLF001

    def raise_invalid(*args, **kwargs):  # type: ignore[no-untyped-def]
        raise jwt.InvalidTokenError("signature verification failed")

    monkeypatch.setattr(jwt, "decode", raise_invalid)

    with pytest.raises(HTTPException) as exc_info:
        validator.validate("bad-token")

    assert exc_info.value.status_code == 401
