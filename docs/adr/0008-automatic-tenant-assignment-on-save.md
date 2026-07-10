# ADR 0008 — Automatic tenant assignment on save

Status: accepted (2026-07)

## Context

Creating a new tenant-owned entity still required explicitly fetching
the current tenant and threading it into the mapping extension
(`command.ToModel(_currentTenant.TenantId)`, `CreateTagCommandHandler`
injecting `ICurrentTenantProvider` just for this one call) — manual
wiring for a value that's always the same thing: "whoever is making
this request." Every other per-save concern that follows that same
shape (`CreatedAt`/`CreatedBy`) is already handled automatically by
`AuditableEntitySaveChangesInterceptor` (docs/adr/0006); tenant
assignment was the one still done by hand.

## Decision

`ITenantOwned` gains a behavior method, mirroring `BaseEntity`'s
`MarkCreated`/`MarkUpdated`/`MarkDeleted`:

```csharp
public interface ITenantOwned
{
    Guid TenantId { get; }
    void AssignTenant(Guid tenantId);
}
```

`Tag.AssignTenant` keeps the "must be a real tenant" check that used to
live in the constructor:

```csharp
public void AssignTenant(Guid tenantId)
{
    if (tenantId == Guid.Empty)
    {
        throw new InvalidTagException("A tag must belong to a tenant.");
    }
    TenantId = tenantId;
}
```

`AuditableEntitySaveChangesInterceptor` (services-service) now also
takes `ICurrentTenantProvider` and, for every `Added` entry that is
`ITenantOwned` with `TenantId == Guid.Empty`, calls `AssignTenant` with
the current tenant — **or throws `InvalidOperationException` if none is
available**, so a tenant-less row can never reach the database even
though the entity itself can now exist transiently without one. An
entity constructed with an explicit, non-empty tenant (still fully
supported — tests do this constantly) is left alone; the interceptor
only fills the gap when nothing else set it.

`CreateTagCommandExtensions.ToModel()` drops its `Guid tenantId`
parameter and constructs with `TenantId = Guid.Empty` on purpose:

```csharp
public static Tag ToModel(this CreateTagCommand command) =>
    new(Guid.CreateVersion7(), Guid.Empty, command.Name, TagColor.From(command.Color), command.Description);
```

`CreateTagCommandHandler` no longer needs `ICurrentTenantProvider`
injected at all:

```csharp
var tag = command.ToModel();
```

### The trade-off, stated plainly

Before this change, `Tag`'s constructor made "a tag without a tenant"
*unrepresentable* — you could not even construct one in memory.  After
this change, that's representable transiently (between `ToModel()` and
`SaveChangesAsync`), and the guarantee moved to "a tag without a tenant
can never be *persisted*" instead, enforced by the interceptor's throw.
This is the same trade already made for `CreatedAt`/`CreatedBy` (ADR
0006) — extended here to a field that actually matters for security
(tenant isolation), which is why the interceptor fails loudly instead
of silently defaulting.

`TenantHeaderFilter` is still the primary control (docs/adr/0006): by
the time any handler runs, the request's tenant has already been
validated against the JWT claim, so in practice `ICurrentTenantProvider.TryGetTenantId`
only fails for genuinely tenant-less contexts (background work, an M2M
token calling something it shouldn't) — exactly the case that should
throw rather than persist garbage.

## Consequences

- A new tenant-owned entity's create-flow handler no longer needs
  `ICurrentTenantProvider` injected, and its `ToModel()`-style mapping
  extension no longer takes a tenant id parameter — construct with
  `Guid.Empty` and let the interceptor fill it in.
- `AssignTenant` still enforces "must be a real tenant" (moved from the
  constructor, not dropped) - and the interceptor's own check means a
  request with no tenant available fails the save, not silently.
- Domain-level and handler-level unit tests that need a specific tenant
  id can still pass it straight to the constructor - the interceptor
  only acts when it's `Guid.Empty`.
- `ServicesService.IntegrationTests.AuditableEntitySaveChangesInterceptorTests`
  (EF Core InMemory, no Docker needed) is the regression test for this
  mechanism specifically - covers auto-assignment, the no-tenant throw,
  and leaving an explicitly-set tenant alone.
- `backend/CLAUDE.md` and the `backend-use-case` skill are updated to
  teach this as the default for any future tenant-owned entity.
