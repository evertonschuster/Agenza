# ADR 0009 — TenantOwnedEntity base class

Status: accepted (2026-07)

## Context

Once `ServiceOffering` existed alongside `Tag`, both entities carried
identical boilerplate for their `ITenantOwned` implementation: the same
`TenantId` property, and an `AssignTenant` method with the same
`Guid.Empty` guard. With one entity this was fine (docs/adr/0008); with
two it was real duplication that every future tenant-owned entity would
repeat verbatim.

## Decision

Each service's `Domain/Common/` gains a `TenantOwnedEntity` abstract
class combining `BaseEntity` and `ITenantOwned`:

```csharp
public abstract class TenantOwnedEntity : BaseEntity, ITenantOwned
{
    public Guid TenantId { get; private set; }

    protected TenantOwnedEntity() { }
    protected TenantOwnedEntity(Guid id) : base(id) { }

    public void AssignTenant(Guid tenantId)
    {
        if (tenantId == Guid.Empty)
        {
            throw new InvalidTenantException();
        }
        TenantId = tenantId;
    }
}
```

`Tag` and `ServiceOffering` inherit `TenantOwnedEntity` instead of
`BaseEntity`/`ITenantOwned` directly, and add nothing else for the
tenant concern — no `TenantId` property, no `AssignTenant` override.

A missing tenant on `AssignTenant` always raises the same
`InvalidTenantException` (`{Service}.Domain/Exceptions/InvalidTenantException.cs`),
regardless of which entity. This is a deliberate departure from the
per-entity `Tag.Invalid`/`ServiceOffering.Invalid` codes every other
domain invariant uses: a tag with a bad name and a service offering
with a bad name are different mistakes a caller can make, but "no
tenant was available to assign" is the same scoping bug no matter which
entity hit it — `AuditableEntitySaveChangesInterceptor` calling
`AssignTenant(Guid.Empty)` is not supposed to happen in practice (it
only calls it with a real, already-resolved tenant id — see
docs/adr/0008), so this path exists as a defensive guard, not a
user-facing validation message that needs entity-specific wording.

## Consequences

- A new tenant-owned entity inherits `TenantOwnedEntity`, not
  `BaseEntity` + `ITenantOwned` — one less interface to wire up, no
  `TenantId` property to declare, and no `AssignTenant` guard to
  copy-paste or override.
- `typeof(ITenantOwned)` passed to `ApplyAuditableConventions` still
  matches every `TenantOwnedEntity` subclass unchanged — the interface
  is satisfied via inheritance, so the DbContext query-filter wiring
  (docs/adr/0006) needed no change.
- `AuditableEntitySaveChangesInterceptor`'s save-time `AssignTenant`
  call (docs/adr/0008) is untouched — it still just needs
  `entity is ITenantOwned`.
- Only entities that genuinely aren't tenant-owned (e.g. `Tenant` in
  identity-service) inherit `BaseEntity` directly; everything else
  inherits `TenantOwnedEntity`.
- `backend/CLAUDE.md` and the `backend-use-case` skill are updated to
  teach `TenantOwnedEntity` as the default — a new tenant-owned entity
  needs no tenant-related code of its own at all.
