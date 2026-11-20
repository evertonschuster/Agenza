---
name: agenza-backend-slice
description: Builds or changes a use case in an Agenza .NET service — domain, value objects, validator, handler, persistence, migration and HTTP endpoint (caso de uso, entidade, migration, endpoint). Use when implementing backend behavior. Not for reviewing a diff (agenza-backend-review) or tracing tenant scope (agenza-tenant-isolation).
---

# Build a backend slice

The [backend architecture](../../../backend/docs/ARCHITECTURE.md) owns the rules, and its
[reference code](../../../backend/docs/ARCHITECTURE.md#10-reference-code-and-the-older-generation)
separates current patterns from older slices: copy Clients, not the file next to you.

| Work                                                     | Procedure                                       |
| -------------------------------------------------------- | ----------------------------------------------- |
| Aggregate, child, behavior or service-local value object | [domain.md](references/domain.md)               |
| Shared string/date value object and binding              | [value-objects.md](references/value-objects.md) |
| Request, validator, mapping, handler or response         | [use-case.md](references/use-case.md)           |
| Repository, EF configuration or migration                | [persistence.md](references/persistence.md)     |
| Selecting and writing backend tests                      | [tests.md](references/tests.md)                 |
| Provisioning OAuth clients and scopes                  | [oauth-clients.md](references/oauth-clients.md)          |
| Proving MCP OAuth with IdentityService                   | [mcp-oauth.md](references/mcp-oauth.md)          |

```text
- [ ] Owning context and aggregate found; no new service for an operation inside an existing context
- [ ] Domain rule first, then handler, adapter and HTTP boundary; untouched layers stay untouched
- [ ] Existing invariants and public contract preserved
- [ ] Tests chosen with tests.md, named in pt-BR for each acceptance criterion
- [ ] Contract changed: types regenerated in this PR (agenza-api-contract)
- [ ] Verification loop below passes
```

## Scope and implement

Work from the domain rule outward and keep orchestration in the handler, with the existing ports and
persistence helpers. A performance mechanism needs a concrete problem; do not generalize for imagined
callers. A change of service boundary, shared contract, security rule or persistence guarantee is a
decision for the owner (see the [root workflow](../../../AGENTS.md)).

When touching older code, convert the part the requested change needs for correctness; a broader
migration of nearby slices is a separate decision. Tenant boundaries:
[agenza-tenant-isolation](../agenza-tenant-isolation/SKILL.md).

## Verify

From `backend/`, run `dotnet build AdminBackend.slnx -c Release` and the affected tests with
`dotnet test`, fix and repeat until both pass with zero warnings; the
[backend README](../../../backend/README.md) has the full commands. In the PR, state the behavior
changed, the checks actually run and any guarantee left unverified. For a review, use
[agenza-backend-review](../agenza-backend-review/SKILL.md).
