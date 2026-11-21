"""Exercise the real development OIDC boundary across both backend services.

This intentionally uses only the Python standard library so the same command
can run in CI immediately after Aspire starts the development stack.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from typing import Any
from urllib import error, parse, request


@dataclass(frozen=True)
class HttpResult:
    status: int
    content_type: str
    body: dict[str, Any]


def send(
    method: str,
    url: str,
    *,
    form: dict[str, str] | None = None,
    json_body: dict[str, str] | None = None,
    bearer_token: str | None = None,
) -> HttpResult:
    headers = {"Accept": "application/json"}
    data: bytes | None = None

    if form is not None:
        headers["Content-Type"] = "application/x-www-form-urlencoded"
        data = parse.urlencode(form).encode()
    elif json_body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(json_body).encode()

    if bearer_token is not None:
        headers["Authorization"] = f"Bearer {bearer_token}"

    http_request = request.Request(url, data=data, headers=headers, method=method)
    try:
        with request.urlopen(http_request, timeout=10) as response:
            raw_body = response.read().decode()
            return HttpResult(
                status=response.status,
                content_type=response.headers.get_content_type(),
                body=parse_body(raw_body),
            )
    except error.HTTPError as response:
        raw_body = response.read().decode()
        return HttpResult(
            status=response.code,
            content_type=response.headers.get_content_type(),
            body=parse_body(raw_body),
        )


def parse_body(raw_body: str) -> dict[str, Any]:
    if not raw_body:
        return {}
    try:
        parsed = json.loads(raw_body)
    except json.JSONDecodeError:
        return {"raw": raw_body}
    return parsed if isinstance(parsed, dict) else {"value": parsed}


def require_status(result: HttpResult, expected: int, scenario: str) -> None:
    if result.status != expected:
        raise AssertionError(
            f"{scenario}: expected HTTP {expected}, received {result.status}: {result.body}"
        )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--identity-url", default="https://localhost:7081")
    parser.add_argument("--services-url", default="http://localhost:5080")
    args = parser.parse_args()

    readiness = send("GET", f"{args.services_url}/health")
    require_status(readiness, 200, "services-service readiness with identity available")

    unauthenticated = send(
        "POST",
        f"{args.identity_url}/internal/v1/tenants",
        json_body={
            "tenantName": "Must not be created",
            "ownerEmail": "unauthenticated@demo.local",
            "ownerPassword": "NotCreated1!",
        },
    )
    require_status(unauthenticated, 401, "anonymous identity-admin request")
    if unauthenticated.content_type != "application/problem+json":
        raise AssertionError("identity-service 401 did not use application/problem+json")
    if unauthenticated.body.get("code") != "Authorization.Unauthorized":
        raise AssertionError(
            "identity-service 401 did not return the stable Authorization.Unauthorized code"
        )

    print("OIDC contract smoke passed: service readiness and stable anonymous 401.")


if __name__ == "__main__":
    main()
