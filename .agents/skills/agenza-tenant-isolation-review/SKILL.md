---
name: agenza-tenant-isolation-review
description: >
  Use for multi-tenant security reviews across auth, HTTP, repositories,
  persistence, caches, migrations, UI state, and AI delegation. Any observable
  cross-tenant exposure is a security/privacy failure.
---

# Tenant-isolation review

Trace one tenant-owned operation end to end and inspect the executable boundary.

## Trace

1. **Identity:** tenant claim originates from the authenticated principal.
2. **Request:** `X-Tenant-Id` is added atomically with the access token and is
   verified against the claim; client input alone is never trusted.
3. **Application:** handlers/repositories do not accept arbitrary tenant ids or
   assign tenant ownership manually.
4. **Persistence:** global filters read live context; save interception assigns
   ownership and fails closed; joins, indexes, uniqueness, and foreign keys
   include the tenant boundary.
5. **Output:** responses, logs, errors, exports, caches, and UI state cannot leak
   another tenant's data, even transiently.
6. **Delegation:** AI/background/M2M work has an explicit tenant-bound identity
   or remains strictly tenant-free.
7. **Tests:** verify two-tenant negative access at the narrowest meaningful
   persistence/runtime boundary.

Review bypasses such as `[IgnoreTenant]`, tenant-free tokens, raw database
queries, cache keys, background jobs, and optimistic UI state explicitly.

Report `surface | tenant source | enforcement | negative proof | finding |
severity | fix`. Put confirmed exposure first and treat it as blocking.
