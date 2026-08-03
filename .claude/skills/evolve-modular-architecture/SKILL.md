---
name: evolve-modular-architecture
description: Assess, design, review, and incrementally evolve modular software architecture from repository and business evidence. Use when defining or repairing module boundaries, decomposing a monolith, choosing between a simple monolith, modular monolith, and microservices, selecting architecture per module, introducing tactical DDD only where justified, planning a safe extraction or migration, writing ADRs, or creating automated architectural fitness functions that prevent structural drift.
---

# Evolve Modular Architecture

Make the smallest architecture decision that satisfies demonstrated needs while preserving a credible next move. Treat architecture as a set of hypotheses guarded by feedback, not as a target diagram.

## Operating rules

- Match the user's language.
- Distinguish `observed`, `inferred`, and `unknown` facts. Attach file, metric, or stakeholder evidence to consequential claims.
- Inspect the repository before recommending a target state. Never infer boundaries only from folder names.
- Prefer reversible decisions and delay expensive, distributed, or organization-wide choices until their drivers are real.
- Keep business capability, code, data, integration contracts, ownership, and deployment boundaries explicit. Do not treat projects, packages, layers, or repositories as proof of modularity.
- Apply architecture locally. Different modules may warrant transaction scripts, layered code, or a domain model.
- Include “do nothing yet” as an option. State the cost of both changing and waiting.
- Give every important architectural characteristic at least one fitness function or review trigger.
- When asked only to assess, review, or advise, do not modify code. When asked to implement, make the smallest safe vertical change and verify it.

## Required workflow

### 1. Establish the decision

State the decision question, scope, time horizon, current pain, constraints, and success measures. Ask only for missing information that would materially reverse the decision; otherwise proceed with named assumptions.

For a local repository, resolve `collect_architecture_evidence.py` inside
this skill's script-resource directory and run:

```text
python <resolved-collector-path> <repository> --format markdown
```

Use its output as an inventory, not as an architectural verdict. Confirm important signals by reading manifests, entry points, module registration, persistence configuration, integrations, tests, CI, and architecture records.

### 2. Map the current system

Build a compact map covering:

1. Business capabilities and language.
2. Candidate bounded contexts and their owners.
3. Code dependencies and cycles.
4. Data ownership, cross-boundary reads, writes, and transactions.
5. Synchronous calls, messages, contracts, consistency, and failure behavior.
6. Deployment units, change cadence, teams, scaling, security, availability, and cost.

Name modules by business capability or process when possible. Treat entity-like names as provisional. A bounded context is a model and language boundary; it is not automatically a service.

### 3. Classify drivers and coupling

For each proposed boundary, record:

- Cohesion: rules and changes that belong together.
- Integrators: shared transactions, chatty workflows, coordinated releases, shared ownership, or latency sensitivity that favor staying together.
- Disintegrators: independent scaling cost, markedly different change/deploy cadence, security or compliance isolation, fault isolation, team autonomy, lifecycle, or technology needs that favor separation.
- Readiness: CI/CD, observability, incident ownership, contract testing, data migration, and operational capacity.

Do not use request volume alone as a microservice argument. Prefer at least two independent, module-specific disintegrators plus operational readiness, unless a hard compliance or isolation constraint dominates.

Read [references/decision-framework.md](references/decision-framework.md) for a substantial architecture decision or decomposition.

### 4. Choose the smallest sufficient move

Evolve three axes independently:

| Axis | Lower-cost starting point | Escalate only when |
| --- | --- | --- |
| Deployment | One deployable with explicit modules | A module has compelling disintegrators and manageable integrators |
| Code structure | Vertical slices inside a module | A module's size, rules, team contention, or dependency control needs stronger physical separation |
| Domain model | Transaction script or simple layered code | Evolving invariants, concurrency, and business language justify entities, value objects, aggregates, or domain events |
| Integration | Direct call or in-process event | Process separation, temporal decoupling, durability, replay, or reliability requirements justify external messaging |
| Data | One database with explicit module ownership | Independent lifecycle, scaling, isolation, or service extraction justifies physical separation |

Use this progression as a set of options, not a maturity model:

1. Organize one codebase by business capability and vertical slice.
2. Enforce logical modules, explicit public contracts, and owned data.
3. Separate selected modules into projects/packages when stronger compile-time or team boundaries pay for the added structure.
4. Extract one service at a time when evidence justifies independent deployment.
5. Apply tactical DDD only inside business-complex contexts, whether monolithic or distributed.

Do not force every module into the same pattern. A reporting module may remain a transaction script while a contract or pricing module uses a rich domain model.

### 5. Define boundaries and fitness functions

Require, where applicable:

- No cyclic module dependencies.
- No access to another module's internal types.
- No foreign table writes; cross-module data access must use an explicit contract or consciously documented read model.
- No shared business entities as a “common” model.
- Explicit dependency direction and allowed integration styles.
- Versioned, consumer-aware external contracts.
- Idempotency, retries, dead-letter handling, traceability, and inbox/outbox where asynchronous reliability requires them.
- Characterization, module integration, and contract tests around migration seams.

For every rule, specify the automated check, threshold, execution cadence, owner, and response to failure. Read [references/fitness-functions.md](references/fitness-functions.md) when defining CI checks or architecture tests.

### 6. Plan evolution as a sequence

Prefer one end-to-end capability slice at a time. Preserve behavior and contracts before moving structure. Use seams, feature flags, compatibility windows, expand-migrate-contract data changes, observability, and explicit rollback criteria.

Read [references/migration-playbook.md](references/migration-playbook.md) before implementing a module extraction, database split, integration change, or large restructuring.

### 7. Record and communicate the decision

For a meaningful decision, deliver:

1. Recommendation in one paragraph.
2. Evidence and uncertainty.
3. Drivers and constraints.
4. Options, including waiting, with trade-offs.
5. Chosen boundaries, ownership, data, and integration semantics.
6. Incremental plan with checkpoints.
7. Fitness functions.
8. Risks, rollback, and review triggers.
9. ADR when the decision affects multiple teams, a public contract, data ownership, deployment, or long-term cost.

Use [references/templates.md](references/templates.md) for an assessment, module contract, evolution plan, or ADR. Keep small answers proportional; do not emit every template for a narrow question.

## Implementation discipline

- Inspect existing conventions and preserve unrelated user changes.
- Add characterization tests before moving unclear behavior.
- Introduce the boundary rule in the same change that introduces the boundary.
- Move one vertical slice, prove it, then continue.
- Keep old and new contracts compatible during migration.
- Avoid big-bang rewrites and speculative abstraction layers.
- Verify compile/build, targeted tests, architecture tests, and affected integration or contract tests.
- Report what remains unknown and which production metrics should decide the next step.

## Failure patterns to reject

- Selecting microservices because the system is “large” or may scale someday.
- Applying Clean Architecture, CQRS, event sourcing, or tactical DDD uniformly.
- Calling a shared database modular while any module can mutate any table.
- Creating a “common” package that contains business concepts from multiple contexts.
- Replacing direct calls with events when the workflow requires an immediate answer or atomic state change.
- Hiding a distributed monolith behind messaging, shared contracts, or coordinated releases.
- Counting projects, services, or repositories as the outcome.
- Writing an ADR after implementation merely to rationalize a settled choice.
- Treating a snapshot architecture as final; define when evidence should reopen the decision.

## Repository-derived example

The reference repository demonstrates a sequence from a vertically sliced single project, to differently structured modules, to one evidence-led service extraction, and finally to selective tactical DDD. Read [references/source-notes.md](references/source-notes.md) only when the user asks about that repository, requests a worked example, or wants its exact architectural lineage.
