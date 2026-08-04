---
name: agenza-backend-use-case
description: >
  Use when adding or changing .NET business behavior under backend/, including
  commands, queries, entities, repositories, endpoints, validators, and
  vertical slices. Applies the repository's CQRS, Result, domain, persistence,
  tenant, and test boundaries.
---

# Backend use case

Read the root and backend `AGENTS.md`, then inspect the closest production slice
and tests. Use live code and generated contracts as templates.

## Rule ownership

| Rule | Owner |
| --- | --- |
| Required/format/range/cross-field request shape | Synchronous validator |
| Existence, uniqueness pre-check, in-use, another aggregate | Handler |
| Permanent invariant | Domain factory/mutation returning `DomainResult` |
| Race-safe integrity | Database constraint + `PersistenceResult` mapping |
| Unexpected technical failure | Exception |

Expected outcomes never throw. Validators never query repositories. A nullable
lookup is handled explicitly; do not silence it with `!`.

## Smallest complete slice

1. **Domain:** inherit the correct base entity, keep setters private, validate
   before mutation, and return `DomainResult`.
2. **Port:** add a narrow intent-revealing interface. Repository methods never
   accept arbitrary tenant ids; staging methods do not commit internally.
3. **Application:** place command/query, validator, handler, and local mapping
   under `Application/<Feature>/<Operation>/`.
4. **Handler:** map not-found/conflict/domain/persistence failures explicitly,
   then commit through the service unit of work. Use a transaction only for a
   real multi-write atomic boundary.
5. **Infrastructure:** implement the port using current shared conventions.
   Never duplicate tenant/soft-delete filters. Trigger migration safety for any
   schema change.
6. **API:** authorize by default, bind/merge route ids, dispatch, and use the
   shared Result-to-HTTP mapper. Controllers do not own business logic.

## Tests

- Domain: factories, mutation, invariant failures, and programming guards.
- Validator: synchronous shape rules.
- Handler: success, not-found, conflict, reachable domain failure, persistence
  failure, and required interactions.
- Persistence: tenant assignment/filter/index/relationship behavior when
  affected.
- Contract/runtime: use the current CI boundary when controller, OpenAPI, auth,
  or OIDC behavior changed.

Run all backend and governance gates and report actual results.
