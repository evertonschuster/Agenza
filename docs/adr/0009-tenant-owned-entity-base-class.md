# ADR 0009 — TenantOwnedEntity base class

Status: accepted (2026-07)

## Context

Once `ServiceOffering` existed alongside `Tag`, both entities carried
identical boilerplate for their `ITenantOwned` implementation: the same
`TenantId` property, and an `AssignTenant` method that only differed in
which `BusinessException` subtype it threw on `Guid.Empty`. With one
entity this was fine (docs/adr/0008); with two it was real duplication
that every future tenant-owned entity would repeat verbatim.

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
            throw CreateTenantRequiredException();
        }
        TenantId = tenantId;
    }

    protected abstract BusinessException CreateTenantRequiredException();
}
```

`Tag` and `ServiceOffering` inherit `TenantOwnedEntity` instead of
`BaseEntity`/`ITenantOwned` directly, and each only supplies the one
line that has to differ:

```csharp
protected override BusinessException CreateTenantRequiredException() =>
    new InvalidTagException("A tag must belong to a tenant.");
```

The `TenantId` property and the empty-guid guard live in exactly one
place now. `CreateTenantRequiredException()` is the deliberate seam:
without it, centralizing `AssignTenant` would force every entity's
"missing tenant" 400 response through the same generic `Code`, losing
`Tag.Invalid` vs `ServiceOffering.Invalid` as distinct, filterable error
codes for API consumers.

## Consequences

- A new tenant-owned entity inherits `TenantOwnedEntity`, not
  `BaseEntity` + `ITenantOwned` — one less interface to wire up, and no
  copy-pasted `AssignTenant` guard to keep in sync across entities.
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
  teach `TenantOwnedEntity` as the default, with
  `CreateTenantRequiredException()` as the one override every new
  tenant-owned entity provides.
