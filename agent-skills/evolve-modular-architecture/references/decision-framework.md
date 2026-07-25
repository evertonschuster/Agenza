# Evidence-led decision framework

## Contents

1. Decision framing
2. Boundary discovery
3. Architecture axes
4. Escalation gates
5. Integration and data decisions
6. Evidence quality

## Decision framing

Express the decision as a falsifiable question:

> Given `<drivers and constraints>`, should `<scope>` move from `<current state>` to `<candidate state>` now, and which evidence would cause us to keep, reverse, or revisit that move?

Capture:

- Current behavior and architecture.
- Desired measurable outcome.
- Time horizon.
- Constraints that cannot be traded.
- Assumptions that can be tested.
- Options, including no change.
- Reversal cost and blast radius.

Prefer measurements local to the candidate module over system-wide averages.

## Boundary discovery

Triangulate boundaries from several kinds of evidence:

- Business language and capability.
- Rules and invariants that change together.
- Workflow and event boundaries.
- Data ownership and transaction boundaries.
- Code change coupling from version history.
- Team ownership and release coordination.
- Runtime latency, load, failure, and security needs.

Classify each candidate boundary:

| Label | Meaning |
| --- | --- |
| Observed | Directly supported by code, metrics, history, or stakeholder statement |
| Inferred | Plausible interpretation with named evidence |
| Unknown | Material question that still needs discovery |

Do not accept folder structure as the only source. A capability may span folders, and a folder may contain several capabilities.

### Boundary quality questions

- Does the module have one coherent business purpose?
- Can its public contract be described without exposing its persistence model?
- Does it own its decisions and writes?
- Can callers tolerate its chosen consistency and failure semantics?
- Do changes mostly stay within it?
- Is the boundary meaningful to domain experts and operators?
- Can the boundary be tested independently?

## Architecture axes

Treat these axes independently:

### Deployment topology

- Single deployable.
- Modular monolith with physically separated modules.
- Hybrid: monolith plus selected service.
- Multiple independently deployable services.

### Domain logic pattern per module

- Transaction script for straightforward workflows and reports.
- Simple layered/active-record style for CRUD with modest logic.
- Domain model for behavior-rich rules.
- Tactical DDD building blocks for complex, evolving invariants.

### Integration

- Direct in-process call for immediate response or atomic coordination.
- In-process event for local temporal decoupling without durability.
- External synchronous contract when a separate process must answer now.
- Durable asynchronous messaging when delay is acceptable and reliability/decoupling justifies failure-handling cost.

### Data topology

- Shared database server with explicit schema/table ownership.
- Separate schema or database per module/service.
- Replicated read model for cross-context queries.
- Event-carried state transfer when consumers need local data and eventual consistency is acceptable.

Do not escalate all axes together. Separating projects does not require separating deployment; tactical DDD does not require microservices.

## Escalation gates

### Logical module to physical project/package

Escalate when several signals persist:

- A module is large or changes at a distinctly different cadence.
- Teams repeatedly collide in the same compilation or ownership boundary.
- Module-specific architecture differs materially.
- Namespace or lint rules do not adequately prevent unwanted dependencies.
- Independent test execution or build performance matters.

Check the cost:

- More manifests, dependency management, build graph, test setup, and public surface.
- Risk of creating excessive shared packages.

### Module to service

Prefer at least two independent disintegrators:

- Independent scaling prevents material cost or performance harm.
- Change/deploy cadence creates measurable release risk or coordination delay.
- Security, compliance, residency, or trust boundary differs.
- Availability or fault-isolation target differs.
- Stable team ownership needs independent lifecycle.
- Technology or data lifecycle is truly incompatible.

Require manageable integrators:

- Few cross-boundary transactions.
- Non-chatty calls.
- Contract can be explicit and versioned.
- Data can be owned without routine cross-service writes.
- Release coordination can actually decrease.

Require readiness:

- Independent CI/CD and rollback.
- Metrics, logs, traces, alerts, and incident ownership.
- Contract and integration tests.
- Retry, timeout, idempotency, and failure recovery.
- Data migration and reconciliation plan.

Hard constraints may override the two-signal heuristic, but name them.

### Simple model to tactical DDD

Escalate locally when:

- Business rules are numerous, interacting, and changing.
- Invariants must remain valid under concurrency.
- Domain language is important and behavior belongs with the model.
- Transaction boundaries need an explicit aggregate.
- Current conditionals and service orchestration obscure intent.

Do not escalate for simple CRUD, reporting, integration plumbing, or technical complexity alone.

## Integration and data decisions

For each interaction, state:

- Initiator and owner.
- Command, query, notification, or event.
- Required response time.
- Consistency requirement.
- Delivery semantics and duplicate behavior.
- Timeout, retry, and failure path.
- Contract owner and compatibility policy.
- Observability and reconciliation.

Use messaging only when the business process tolerates delay. “Exactly once” is not a design assumption; make consumers idempotent and define deduplication or reconciliation where consequences matter.

Keep data ownership strict:

- One module owns every write.
- Other modules use an API, message, or owned read model.
- Cross-context reporting may read replicated or explicitly exposed data, but must not become an undocumented write path.
- Shared infrastructure may be common; shared business models usually couple contexts.

## Evidence quality

Prefer:

- Change-coupling data over anecdotes about “many conflicts.”
- Module-specific p95/p99 and cost over total request counts.
- Deployment-failure and lead-time data over opinions about autonomy.
- Named invariants and consistency needs over generic “DDD complexity.”
- Failure drills and recovery evidence over broker/library selection.

Avoid pseudo-precision. If weights or scores are used, show their assumptions and never let a total hide a hard constraint or strong integrator.
