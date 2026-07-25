"""Exercise the real development OIDC boundary across both backend services.

This intentionally uses only the Python standard library so the same command
can run in CI immediately after Aspire starts the development stack.
"""

from __future__ import annotations

import argparse
import json
import secrets
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


def request_token(
    identity_url: str,
    client_id: str,
    client_secret: str,
    scope: str,
) -> str:
    result = send(
        "POST",
        f"{identity_url}/connect/token",
        form={
            "grant_type": "client_credentials",
            "client_id": client_id,
            "client_secret": client_secret,
            "scope": scope,
        },
    )
    require_status(result, 200, f"token for {client_id}")
    token = result.body.get("access_token")
    if not isinstance(token, str) or not token:
        raise AssertionError(f"token for {client_id}: response has no access_token")
    return token


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--identity-url", default="http://localhost:5081")
    parser.add_argument("--services-url", default="http://localhost:5080")
    parser.add_argument(
        "--assistant-secret",
        default="dev-assistant-worker-secret-change-me",
    )
    parser.add_argument(
        "--provisioning-secret",
        default="dev-tenant-provisioning-secret-change-me",
    )
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

    assistant_token = request_token(
        args.identity_url,
        "assistant-service-worker",
        args.assistant_secret,
        "services-api",
    )

    tenant_boundary = send(
        "GET",
        f"{args.services_url}/api/v1/categories",
        bearer_token=assistant_token,
    )
    require_status(tenant_boundary, 403, "tenant-free worker at tenant-owned endpoint")
    if tenant_boundary.content_type != "application/problem+json":
        raise AssertionError("services-service 403 did not use application/problem+json")
    if tenant_boundary.body.get("code") != "Tenant.ContextMismatch":
        raise AssertionError(
            "services-service 403 did not return the stable Tenant.ContextMismatch code"
        )

    wrong_scope = send(
        "POST",
        f"{args.identity_url}/internal/v1/tenants",
        bearer_token=assistant_token,
        json_body={
            "tenantName": "Must not be created",
            "ownerEmail": "wrong-scope@demo.local",
            "ownerPassword": "NotCreated1!",
        },
    )
    require_status(wrong_scope, 403, "services-api token at identity-admin endpoint")
    if wrong_scope.body.get("code") != "Authorization.MissingScope":
        raise AssertionError(
            "identity-service 403 did not return the stable Authorization.MissingScope code"
        )

    provisioning_token = request_token(
        args.identity_url,
        "tenant-provisioning-cli",
        args.provisioning_secret,
        "identity-admin",
    )
    nonce = secrets.token_hex(6)
    provisioned = send(
        "POST",
        f"{args.identity_url}/internal/v1/tenants",
        bearer_token=provisioning_token,
        json_body={
            "tenantName": f"Architecture check {nonce}",
            "ownerEmail": f"architecture-check-{nonce}@demo.local",
            "ownerPassword": f"Architecture-{nonce}-1!",
        },
    )
    require_status(provisioned, 201, "identity-admin tenant provisioning")
    if not provisioned.body.get("tenantId"):
        raise AssertionError("tenant provisioning response has no tenantId")

    print(
        "OIDC contract smoke passed: stable 401, client credentials, scope "
        "denial, tenant fail-closed boundary, and authorized provisioning."
    )


if __name__ == "__main__":
    main()
