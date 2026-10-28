# Persistence

The architecture owns [tenancy and persistence rules](../../../../backend/docs/ARCHITECTURE.md#5-tenancy-and-persistence).
Use [tenant isolation](../../agenza-tenant-isolation/SKILL.md) when the changed path affects scoping.

## Repository and update path

Inspect [IClientRepository](../../../../backend/services/services-service/ServicesService.Application/Abstractions/IClientRepository.cs)
and [ClientRepository](../../../../backend/services/services-service/ServicesService.Infrastructure/Repositories/ClientRepository.cs)
for the port/adapter seam. Add only the operation the handler needs, returning the domain aggregate
or its page rather than exposing EF queries or projecting an HTTP DTO.

Trace tracking from the DbContext default to the eventual save. The command can change a detached
aggregate and then call UpdateAsync; the adapter owns attaching/staging its state. Do not add a
second port method whose only distinction is EF tracking.

Check which children the operation requires before narrowing a read. An update that synchronizes
the stored composition from the in-memory aggregate can remove children missing from a partial
read. Query filters already provide tenant and soft-delete scope; do not replace them with manual
predicates, drop the tenant filter or save inside a repository.

For listing, keep an explicit stable order ending in a unique key. Compare value-object columns as
values. For text search/order, inspect ClientRepository together with
[ClientConfiguration](../../../../backend/services/services-service/ServicesService.Infrastructure/Persistence/Configurations/ClientConfiguration.cs):
generated string columns handle operations that cannot translate through a value-object converter.
A pre-check helps the caller recover; the unique index decides races.

## Configuration and migration

1. Start from the aggregate's actual relationships and the architecture's configuration checklist.
   Verify tenant-qualified keys/FKs, value conversions, lengths, uniqueness filters and enum CHECKs.
2. For children, inspect identity generation and access mode. The domain creates their ids; the
   adapter must not interpret a new child as an existing modified row.
3. Generate the migration through the service's existing tooling. Review both Up and Down for
   destructive operations, key/filter changes and changes to stored data. Keep committed migrations
   immutable; use a subsequent migration for an evolution.
4. Check pending model changes using the command in
   [the architecture](../../../../backend/docs/ARCHITECTURE.md#5-tenancy-and-persistence).
   Inspect the generated SQL when PostgreSQL behavior is material.

Use [tests.md](tests.md) to distinguish model metadata/EF behavior from relational enforcement.
A composite FK, filtered uniqueness race or CHECK needs evidence from disposable PostgreSQL under
the current verification policy; do not use the persistent development volume or claim InMemory
proves the constraint. Report the actual scenario and result in the PR.
