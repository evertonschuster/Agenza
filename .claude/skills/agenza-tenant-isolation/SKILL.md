---
name: agenza-tenant-isolation
description: Trace tenant authority and isolation when changing authentication, tenant-scoped HTTP or persistence, session identity, or delegated AI-service calls.
---

# Review tenant isolation

The [root rule](../../../AGENTS.md) and
[backend tenancy policy](../../../backend/docs/ARCHITECTURE.md#5-tenancy-and-persistence) own the
invariant: server tenant scope comes from the validated token claim. A routing header or client
value does not grant access.

Open only the affected path:

- .NET authentication, EF persistence, database roles or FastAPI delegation:
  [backend.md](references/backend.md).
- Browser session, API credentials, identity changes or client-side data:
  [frontend.md](references/frontend.md).

## Trace authority before judging a pattern

1. Follow the tenant value from its trusted boundary to the operation. Check authentication,
   header/claim comparison, reads, writes and related records affected by the change.
2. Distinguish client input from trusted infrastructure. A business request or repository call
   must not let its caller choose another tenant. An accessor, validated context or test double
   can carry a tenant internally; inspect its origin and lifetime rather than rejecting a
   parameter name.
3. Check missing, malformed and mismatched context. The operation must not fall back to an
   unscoped read/write, a process default, or an alternate header.
4. Inspect any bypass: `IgnoreTenant`, raw claims, `IgnoreQueryFilters`, preassigned entity tenants
   or direct SQL. Determine the reachable behavior and what enforces the boundary before reporting.
5. Select evidence for the layer changed. Tests of a fake provider or decoded token do not prove
   HTTP authentication, and EF InMemory does not prove PostgreSQL constraints.

## Report the consequence

Describe the caller, input or transition that can expose or change another tenant's data, with
the code path and the protection that is absent. Separate a demonstrated failure, a reasoned
risk and a convention. A grep hit, unchanged test file or additional decoding site alone is not
a security finding.

Tenant isolation is distinct from operation-level permission. Inspect the endpoint's actual
authorization policy; neither a hidden UI control nor a valid tenant proves that every action
is permitted. If a new machine/background operation needs tenant data, require an explicit
tenant-scoped identity design rather than weakening the existing boundary
([ADR 0022](../../../docs/adr/0022-ai-tenant-context-and-delegation.md)).
