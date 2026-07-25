# ADR 0022 — Tenant context and delegated identity for AI services

Status: accepted (2026-07)

## Context

The AI service validates access tokens, but its authenticated endpoints do
not establish a tenant boundary. Its client-credentials helper also obtains
an application token without a tenant claim. Forwarding that token to a
tenant-owned API either fails closed today or creates pressure to weaken the
downstream tenant checks later.

Tenant-owned operations must never infer a tenant from a request body, a
database row, or a process-wide default. The boundary has to be established
before application work begins and it has to agree with the authenticated
identity.

## Decision

Every tenant-owned AI endpoint requires both:

- an authenticated JWT containing a UUID `tenant_id` claim; and
- an `X-Tenant-Id` header containing the same UUID.

A reusable `TenantContext` dependency validates both values and rejects a
missing, malformed, or mismatched tenant with a stable problem response. The
tenant value exposed to application code comes only from that dependency.
Liveness and readiness endpoints remain tenant-free.

Calls from an AI endpoint to another tenant-owned service delegate the
caller's access token and forward the validated `X-Tenant-Id`. A global
client-credentials token is reserved for explicitly tenant-free
control-plane operations. Background work that needs tenant data must carry
an immutable job envelope with the tenant id and an explicitly designed
service identity; this ADR does not invent a process-wide "current tenant."

`/internal/whoami` remains available as the executable boundary probe, but it
now requires a valid tenant context and returns that validated tenant id.

## Fitness functions

- Unit tests reject a missing tenant claim, missing header, malformed UUID,
  and claim/header mismatch.
- Unit tests prove a valid tenant reaches the endpoint and is returned by the
  boundary probe.
- The architecture guard rejects tenant-owned AI routes that depend directly
  on raw JWT claims instead of `TenantContext`.

## Consequences

Machine-to-machine tokens without a tenant cannot call tenant-owned AI
routes. This is intentional. A future machine workflow must choose and
document its tenant-scoped authorization model instead of receiving implicit
cross-tenant access.

No new service, event bus, or deployment component is introduced.
