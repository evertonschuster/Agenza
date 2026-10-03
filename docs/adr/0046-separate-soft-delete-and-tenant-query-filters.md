# ADR 0046 — Soft delete and tenant scope are separate query filters

Status: accepted (2026-10); supersedes the "one combined predicate" passage of
[ADR 0006](0006-tenant-header-base-entity-generic-repository.md)

## Context

[ADR 0006](0006-tenant-header-base-entity-generic-repository.md) gave every `BaseEntity` one global query filter,
`DeletedAt == null && TenantId == CurrentTenantId`, because EF Core allowed a single `HasQueryFilter` per entity type.
The only way to read a soft-deleted row was `IgnoreQueryFilters()`, which drops the tenant scope together with the
soft delete.

#154 brought the first read that must see soft-deleted rows: a CPF stays unique per tenant across deleted persons
([ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md)). Its first version called
`IgnoreQueryFilters()` and re-applied the tenant with a hand-written predicate, so tenant isolation on that read depended
on remembering the predicate, and the next read of deleted rows would have copied it.

## Decision

`ApplyAuditableConventions` registers two named filters (EF Core 10):

- `SoftDelete`: `DeletedAt == null`, on every `BaseEntity`;
- `Tenant`: `TenantId == CurrentTenantId`, read off the live `DbContext`, on every tenant-owned `BaseEntity`.

A read that must see soft-deleted rows uses `RepositoryBase.SetIncludingDeleted`, which ignores `SoftDelete` and nothing
else. The filter keys are `internal` to `Admin.SharedKernel.EntityFrameworkCore`, so application code has no name with
which to switch the tenant filter off.

## Consequences

- No migration: query filters live in the runtime model, not in the schema.
- EF rejects an anonymous filter next to named ones, so any new filter on a `BaseEntity` must be named.
- identity-service has no tenant-owned entities and gets the `SoftDelete` filter alone; its reads are unchanged.
- `IgnoreQueryFilters()` without keys stays legitimate only in a persistence test asserting a soft delete.
- `ServicesDataContextTenantScopingTests` asserts both filters on every tenant-owned entity and that ignoring
  `SoftDelete` keeps the tenant scope. The two-context model-cache test
  ([ADR 0019](0019-narrow-tenant-isolation-persistence-tests.md)) is unchanged; the live-context access it protects
  moved from `BuildFilter` to `BuildTenantFilter`.

## Tried and reverted

- **`IgnoreQueryFilters()` with the tenant re-applied by hand** in `ClientRepository.FindByCpfAsync`: the first version
  of #154, replaced before merge by this decision.
