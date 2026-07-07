import asyncio
import time

import httpx

from .config import IdentityConfig


class ServiceTokenClient:
    """Fetches an M2M access token from identity-service's client_credentials
    grant and caches it in memory until shortly before it expires, so
    outbound calls to other backend services don't re-authenticate on
    every request."""

    def __init__(self, config: IdentityConfig) -> None:
        self._config = config
        self._access_token: str | None = None
        self._expires_at: float = 0.0
        self._lock = asyncio.Lock()

    async def get_access_token(self) -> str:
        if self._access_token is not None and time.monotonic() < self._expires_at:
            return self._access_token

        # Concurrent callers can all miss the cache at once; the lock
        # collapses them into a single refresh instead of a thundering
        # herd against identity-service's /connect/token.
        async with self._lock:
            now = time.monotonic()
            if self._access_token is not None and now < self._expires_at:
                return self._access_token

            if not self._config.client_secret:
                raise RuntimeError(
                    "Missing IDENTITY_CLIENT_SECRET environment variable - required to "
                    "request M2M tokens from identity-service."
                )

            async with httpx.AsyncClient(base_url=self._config.authority) as client:
                response = await client.post(
                    "/connect/token",
                    data={
                        "grant_type": "client_credentials",
                        "client_id": self._config.client_id,
                        "client_secret": self._config.client_secret,
                        "scope": self._config.scope,
                    },
                )
                response.raise_for_status()
                payload = response.json()

            self._access_token = payload["access_token"]
            self._expires_at = now + max(payload.get("expires_in", 300) - 30, 0)

            return self._access_token
