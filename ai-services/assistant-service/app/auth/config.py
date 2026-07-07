import os
from dataclasses import dataclass


@dataclass(frozen=True)
class IdentityConfig:
    """identity-service connection details for this worker. Read from env
    vars (set in infra/docker-compose.yml) rather than a settings file,
    since this service has no other configuration surface yet."""

    authority: str
    """Where this worker reaches identity-service on the docker network -
    used to fetch JWKS/discovery. Not necessarily the same URL that issued
    a given token (see `issuer`)."""
    issuer: str
    """The fixed `iss` claim identity-service stamps on every token
    (Identity:PublicIssuer in its own config) - kept separate from
    `authority` because callers reach identity-service via different
    hostnames (browser vs. docker network) but every token must validate
    against the same issuer string regardless of caller."""
    audience: str
    client_id: str
    client_secret: str
    scope: str


def load_identity_config() -> IdentityConfig:
    authority = os.environ.get("IDENTITY_AUTHORITY", "http://localhost:5081")
    return IdentityConfig(
        authority=authority,
        issuer=os.environ.get("IDENTITY_ISSUER", authority),
        audience=os.environ.get("IDENTITY_AUDIENCE", "services-api"),
        client_id=os.environ.get("IDENTITY_CLIENT_ID", "assistant-service-worker"),
        # No fallback: the M2M secret must come from the environment (set
        # in infra/docker-compose.yml) - never a literal default in source.
        # Left empty rather than raising here so importing this module
        # (e.g. inbound-only token validation, or running tests) doesn't
        # require a secret it doesn't need; ServiceTokenClient checks for
        # it at the point it's actually used.
        client_secret=os.environ.get("IDENTITY_CLIENT_SECRET", ""),
        scope=os.environ.get("IDENTITY_SCOPE", "services-api"),
    )
