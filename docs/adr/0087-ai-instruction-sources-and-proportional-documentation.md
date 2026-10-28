# ADR 0087 — Instruction sources and proportional documentation

Status: accepted (2026-10-28); amends
[ADR 0041](0041-ai-instruction-files-reinstated.md) on discovery, skill access and mechanical checks.
The single-source and no-hand-rolled-sync constraints remain.

## Context

The root instructions required an ADR for every decision and prescribed the frontend's Spec Kit
flow across the monorepo. Local guides and skills had already been reconciled with the code, but
shared policy and historical decisions could still direct another agent back to an obsolete shape.
Repeated rules acquired different answers; more files did not provide more reliable guidance.

The failed synchronization framework in [ADR 0016](0016-ai-agent-governance-framework.md) compared
copies, not their correctness. Keeping one source remains useful, but it does not make prose
self-verifying or make discovery paths interchangeable across hosts.

## Decision

| Source                               | Owns                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------ |
| Code, configuration, pins and checks | Implemented behavior, dependencies and the properties actually exercised |
| Root and area AGENTS                 | Critical invariants and routing by task                                  |
| Architecture and API guides          | Current technical conventions, examples and limits                       |
| Skills                               | Task procedures and decision criteria, linking to the owning rule        |
| ADRs                                 | Durable decisions, alternatives, consequences and evolution              |
| Specs                                | A change's behavior and acceptance criteria                              |
| PR and CI                            | Execution evidence, review iterations and limitations of the delivery    |

A discrepancy requires investigation: older code may coexist with an accepted convention, and an
accepted ADR may contain explicitly historical passages. Do not rewrite correct application code
merely to satisfy stale prose. Identify the current portion and its evidence when reconciling it.

Create an ADR for durable changes to boundaries, security, shared contracts, persistence, operation,
significant dependencies or choices with substantial reversal cost. Local reversible implementation
and review adjustments belong in the PR. Preserve meaningful failed alternatives and superseded
decisions; a dated evolution note can reconcile an already implemented change without inventing
another retrospective decision.

Read only the sources relevant to the task. Additional planning artifacts need a purpose:
research for a material uncertainty, a data model for a model change, an extra contract for a
boundary not sufficiently described elsewhere, and a quickstart for specific reusable preparation.
The frontend's installed Spec Kit producers and prerequisites still determine what its current
flow requires; a smaller supported flow needs corresponding tooling changes. This ADR does not
implement them or prescribe that installation for backend and AI work.

Agenza skills keep their canonical bodies in `.claude/skills/agenza-*/`. Area AGENTS route to exact
files; when native discovery is unavailable, an agent with file access reads that path explicitly.
This does not expose a native skill command. Keep the thin `CLAUDE.md` imports and the Copilot
bridge; do not introduce editable mirrors, hand-rolled synchronization or a dependency on symlinks.
Spec Kit distributions remain governed by their own installation/upstream.

Host support depends on surface, configuration and file access. A manifest or a link does not
prove an active integration or a loaded skill. Record what was actually verified; native
installation beyond this arrangement needs a supported mechanism and evidence for that host.

Select validation by the changed behavior and risk while preserving applicable CI gates.
Documentation-only changes need source/reference/format checks and semantic review, not new
application tests. A link or frontmatter check can prove an objective property; agreement between
copies cannot prove a convention correct. No new checker or runtime test tier is introduced here.

## Consequences and alternatives

- One maintained location owns each rule; routing and references still need review when it changes.
- History remains accessible without becoming mandatory context for every edit. Execution records
  stay in PR/CI instead of a growing permanent report.
- Explicit reading provides access without promising automatic discovery. A surface without file
  access cannot be advertised as executing these procedures.
- Keeping the old root policy would preserve contradictory obligations. Restoring synchronized
  copies would recreate the maintenance failure. Both alternatives are rejected.
- Verify active instructions against affected code/configuration and check changed references in
  review. Revisit this arrangement when a required surface cannot read its routed source, upstream
  discovery changes, or a recurring failure justifies a small objective check.

Host mechanisms: [Codex instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[Codex skills](https://learn.chatgpt.com/docs/build-skills),
[Claude imports](https://code.claude.com/docs/en/memory) and
[Copilot support by surface](https://docs.github.com/en/copilot/reference/custom-instructions-support).
