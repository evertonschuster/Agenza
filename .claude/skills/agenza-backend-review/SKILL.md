---
name: agenza-backend-review
description: Review backend diffs for concrete defects, security and data risks, contract regressions, and justified architectural concerns. Report findings in pt-BR with evidence and severity based on impact.
---

# Review a backend change

The [architecture](../../../backend/docs/ARCHITECTURE.md) owns the technical rules. Review the
affected flow and its callers; an older pattern is context, not an instruction to convert unrelated
code. Use [reference code](../../../backend/docs/ARCHITECTURE.md#10-reference-code-and-the-older-generation)
when the nearest file does not represent the current convention.

## Establish the scope

Identify the requested base, head or working-tree diff before reviewing. Inspect the full affected
methods, configuration and callers, not only added lines. A search hit such as `TenantId`,
`IgnoreQueryFilters`, `catch` or a `Helper` class is a lead to investigate, not a finding or severity.

Read only the rules relevant to the change:

| Change                         | Questions and source                                                                                                                                                                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity or tenant scope       | Trace the authority, fail-closed behavior and affected defenses with [tenant isolation](../agenza-tenant-isolation/SKILL.md)                                                                                                                                  |
| Project or aggregate boundary  | Check references, callers and the consistency boundary against [shape](../../../backend/docs/ARCHITECTURE.md#1-shape) and [domain](../../../backend/docs/ARCHITECTURE.md#3-domain)                                                                            |
| Request, handler or error flow | Trace binding, validation, domain behavior, side effects and result mapping against [use-case rules](../../../backend/docs/ARCHITECTURE.md#2-anatomy-of-a-feature) and [error gates](../../../backend/docs/ARCHITECTURE.md#4-errors--one-pipeline-five-gates) |
| Repository or migration        | Check tracking, filters, constraints, concurrent writes and both migration directions against [persistence](../../../backend/docs/ARCHITECTURE.md#5-tenancy-and-persistence)                                                                                  |
| HTTP contract                  | Compare controller, serializer and generated types with [HTTP surface](../../../backend/docs/ARCHITECTURE.md#6-http-surface); the wire schema is not proof of runtime behavior                                                                                |
| Time, logging or style         | Consult the affected [time](../../../backend/docs/ARCHITECTURE.md#7-time) or [style](../../../backend/docs/ARCHITECTURE.md#8-code-style) rule without rewriting independent code                                                                              |
| Verification                   | Identify what the [test tiers](../../../backend/docs/ARCHITECTURE.md#9-tests) and [current checks](../../../backend/docs/ARCHITECTURE.md#11-what-enforces-what) actually establish                                                                            |

For a new abstraction or optimization, explain its concrete cost, missing requirement or affected
invariant. For an architectural deviation, identify the real coupling or rule bypass it introduces.
A different name or shape alone does not demonstrate a high-impact defect.

## Establish the evidence

Choose the cheapest check that can distinguish the suspected failure from correct behavior. Follow
the [backend commands](../../../backend/README.md#commands) for relevant build/tests and the
persistence procedure for database-only properties. Do not run the entire application to review
wording; links, source comparison and formatting are appropriate for documentation changes.

Separate observed results from reasoned risks. Line coverage does not prove HTTP authorization,
PostgreSQL constraints or concurrency. A green build does not establish that adding a project
reference respects the architectural direction. Preserve the distinction between existing checks
and manual evidence; do not credit a removed guard or a test that was not run.

## Classify and report

| Severity   | Criterion                                                                                                                                           |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bloqueante | A demonstrated release blocker, such as cross-tenant access, data loss, an unusable contract or a failing required check attributable to the change |
| Alta       | A credible, serious failure with a concrete trigger or a newly reachable path that bypasses a critical invariant; state the impact and likelihood   |
| Média      | A bounded defect or architectural risk with a concrete consequence and lower impact or likelihood                                                   |
| Baixa      | A local issue with a minor consequence; style/preferences without a defect belong in suggestions                                                    |

Distinguish defects, architectural risks and optional suggestions. A convention still matters, but
its violation does not automatically deserve the same severity as a data or authorization defect.
Do not manufacture findings to fill a quota.

For each finding, give the verified file/line, triggering scenario, consequence, evidence or
uncertainty, and a correction proportional to the problem. Cite the relevant rule when useful.
Keep the report in pt-BR, ordered by impact, and close with checks run and material coverage limits.
If no actionable issue remains, say so. A review-only request does not authorize implementing fixes;
a task that also requests corrections retains that authorization.
