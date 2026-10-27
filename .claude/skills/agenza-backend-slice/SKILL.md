---
name: agenza-backend-slice
description: Build or change a use case in an Agenza .NET service, including domain behavior, handlers, persistence and its HTTP boundary. Use when extending a slice or choosing the relevant implementation pattern.
---

# Build a backend slice

Use the [backend architecture](../../../backend/docs/ARCHITECTURE.md) for the applicable rule.
[Reference code](../../../backend/docs/ARCHITECTURE.md#10-reference-code-and-the-older-generation)
distinguishes current patterns from older slices; read the example related to the change.

| Work                                                     | Procedure                                       |
| -------------------------------------------------------- | ----------------------------------------------- |
| Aggregate, child, behavior or service-local value object | [domain.md](references/domain.md)               |
| Shared string/date value object and binding              | [value-objects.md](references/value-objects.md) |
| Request, validator, mapping, handler or response         | [use-case.md](references/use-case.md)           |
| Repository, EF configuration or migration                | [persistence.md](references/persistence.md)     |
| Selecting and writing backend tests                      | [tests.md](references/tests.md)                 |

## Scope the use case

Find the business context and aggregate that own the behavior before adding a folder. An operation
inside an existing context does not require another service. Work from the relevant domain rule
through the handler, adapter and HTTP boundary; only change layers the task affects.

Preserve the domain's invariants and the existing public contract. If an architectural choice
changes a service boundary, shared contract, security rule or persistence guarantee, follow the
[root workflow](../../../AGENTS.md). Routine implementation choices do not require this skill to
generate extra reports or interrupt the task.

## Implement and verify

Use the procedure above for the affected layer. Keep orchestration in the handler and use existing
ports and persistence helpers. A performance mechanism needs a concrete problem or product rule;
do not generalize for imagined callers.

When touching older code, compare its behavior and relevant current rule. Convert the portion needed
for correctness or the requested change; do not rewrite unrelated patterns merely because an older
example exists nearby. A broader architectural migration is a separate decision.

For tenant boundaries, read [agenza-tenant-isolation](../agenza-tenant-isolation/SKILL.md).
For a changed frontend contract, follow [agenza-api-contract](../agenza-api-contract/SKILL.md) for
regeneration and the backend-first PR workflow; check the current code/schema for endpoint details.

Select tests using [tests.md](references/tests.md) and commands from the
[backend README](../../../backend/README.md). Use
[agenza-backend-review](../agenza-backend-review/SKILL.md) when a review is needed.
In the PR, identify the behavior changed, checks actually run and any unverified guarantee.
