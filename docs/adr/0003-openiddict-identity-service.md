# ADR 0003 — Own OIDC provider via OpenIddict in identity-service

Status: accepted (2026-07)

## Context

Every stack (React SPA, .NET resource services, Python AI services)
needs the same authentication, tenant claims, and M2M service-to-service
tokens. SaaS identity providers (Auth0, etc.) are paid at real usage
levels and externalize the tenant model; hand-rolled JWT issuance is a
security liability.

## Decision

identity-service is the single OIDC authority, built on **OpenIddict** +
ASP.NET Identity:

- SPA: Authorization Code + PKCE (`oidc-client-ts`).
- Services: client credentials flow for M2M, scopes per audience
  (`services-api`, `identity-admin`, ...).
- Access tokens are plain signed JWTs (`DisableAccessTokenEncryption`)
  so any stack can validate them against the JWKS endpoint —
  .NET via `Admin.Identity.Client`, Python via PyJWT/JWKS.
- `tenant_id` is a claim issued by identity-service; resource services
  read it from the validated principal only.
- The issuer is pinned (`Identity:PublicIssuer`) so tokens validate
  identically from the browser, the docker network, and Aspire.

## Consequences

- Zero per-user licensing cost; the tenant model lives in our domain.
- We own key management: production must mount real signing/encryption
  certificates (startup fails without them — intentional).
- Any new service gets auth by referencing `Admin.Identity.Client`
  (.NET) or copying the JWKS validation module (Python).
