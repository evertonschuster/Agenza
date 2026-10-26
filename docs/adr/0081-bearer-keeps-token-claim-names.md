# ADR 0081 — The bearer keeps the token's claim names

Status: accepted (2026-10)

## Context

Every `BaseEntity` has `CreatedBy`, `UpdatedBy` and `DeletedBy`, which `AuditableEntitySaveChangesInterceptor` stamps
with `ICurrentUserAccessor.UserId`. In services-service that accessor is `HttpContextCurrentUserAccessor`, which reads
the principal's `sub` claim. The verification of #159 ([ADR 0080](0080-clients-delete.md)) found the three columns
empty on every row the service had written, for a token that does carry a GUID `sub`.

The cause: `AddIdentityServiceAuthentication` registers `AddJwtBearer` with the framework's default
`MapInboundClaims = true`, so the handler renames `sub` to the long name-identifier claim type before the principal is
built. `FindFirst("sub")` then finds nothing and the accessor answers `null`, the value it reserves for a machine token
with no user. `tenant_id` is not in the map, which is why the tenant boundary kept working. identity-service is not
affected: it authenticates with its own cookie and OpenIddict principal, whose user id claim is already `sub`.

## Decision

**The bearer keeps the claim names the token carries.** `AddIdentityServiceAuthentication` sets
`MapInboundClaims = false`. The accessors read `sub` and `tenant_id` exactly as identity-service issues them, the same
names the frontend and assistant-service read. No accessor learns a second name for the same claim.

**Tests.** `Admin.SharedKernel.Tests` now references `Admin.Identity.Client` and proves the chain with a real token: the
options `AddIdentityServiceAuthentication` builds have `MapInboundClaims` off, and a token signed and validated through
the handler those options hold gives `HttpContextCurrentUserAccessor` its `sub` and `HttpContextTenantAccessor` its
`tenant_id`. With the old registration the subject test failed with `null`, which proved the cause before the fix.

## Consequences

- From this change on, every write of services-service records its actor. Rows written before it keep `null`, because
  nothing records who wrote them; no backfill.
- `User.Identity.Name` stays `null` for a bearer principal: nothing reads it, and a future reader asks for the `name`
  claim by its token name.
- The kernel test project now also measures `Admin.Identity.Client`, so its total line coverage moved from 92.67% to
  86.82%, still above the 80% gate. `TenantHeaderFilter` and the identity health check are the untested part.

Verified by hand on a disposable PostgreSQL 18 with the real services and a real login, 15 checks: the person, its
guardian and a tag record the token's `sub` as `CreatedBy`; an edit records it as `UpdatedBy` on the person and as
`DeletedBy` on the contact the edit replaced; a deactivation records it as `UpdatedBy`; the tenant still comes from the
token, a request with no token answers `401` and a mismatched `X-Tenant-Id` answers `403 Tenant.ContextMismatch`.

## Considered and rejected

- **The accessor also reading the name-identifier claim type.** Two names for one claim, depending on which handler
  built the principal; the next accessor would have to remember both.
- **Keeping the map and removing only `sub` from it.** Same effect for this claim, but every other claim the token adds
  later would still be renamed silently.
