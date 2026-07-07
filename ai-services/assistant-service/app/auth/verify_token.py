from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWKClient

from .config import IdentityConfig, load_identity_config

_bearer_scheme = HTTPBearer()


class TokenValidator:
    """Validates inbound bearer tokens against identity-service's JWKS -
    the same discovery/JWKS endpoint the .NET resource servers use, just a
    different validation stack since this is a separate language runtime.
    PyJWKClient caches the fetched key set internally."""

    def __init__(self, config: IdentityConfig) -> None:
        self._config = config
        self._jwk_client = PyJWKClient(f"{config.authority}/.well-known/jwks")

    def validate(self, token: str) -> dict[str, Any]:
        try:
            signing_key = self._jwk_client.get_signing_key_from_jwt(token)
            return jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=self._config.audience,
                issuer=self._config.issuer,
            )
        except jwt.PyJWTError as error:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {error}",
            ) from error


_validator = TokenValidator(load_identity_config())


def require_valid_token(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_bearer_scheme)],
) -> dict[str, Any]:
    return _validator.validate(credentials.credentials)
