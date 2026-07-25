# Source repository notes

## Source

- Repository: `evolutionary-architecture/evolutionary-architecture-by-example`
- URL: <https://github.com/evolutionary-architecture/evolutionary-architecture-by-example>
- Snapshot reviewed: commit `04c3f717d96f505d8355fac517c780904982d5bd`
- License observed in repository: MIT

These notes summarize architectural lessons; they are not a framework prescription and do not copy the example's .NET choices into unrelated contexts.

## Evolution demonstrated

### Chapter 1: simplicity

- Keep production in one project while making business modules explicit through namespaces.
- Organize business processes as vertical slices.
- Map each assumed bounded context to a module.
- Give modules separate database schemas and prevent direct module references.
- Use an in-memory event bus where a single deployment and accepted loss make durability unnecessary.
- Record decisions, combine unit and integration tests, add architecture tests, and run static analysis.

Key lesson: a simple deployment can preserve seams for future moves without prepaying for distribution.

### Chapter 2: maintainability

Signals:

- Modules grew and diverged in complexity.
- Change cadence differed.
- Several teams produced conflicts in a single production project.

Evolution:

- Split modules into projects.
- Give the complex Contracts module API, Application, Core, and Infrastructure projects.
- Keep Passes and Offers simpler with API and DataAccess.
- Keep Reports as one transaction-script project.
- Retain one deployment and in-memory messaging.

Key lesson: use the architecture each module deserves. Physical project separation adds real cognitive and build cost and is not mandatory for an MVP.

### Chapter 3: growth and service extraction

Module-specific disintegrators for Contracts:

- Much higher usage and independent scaling cost.
- Roughly 10:1 change frequency relative to other modules.
- Higher security requirements.
- Increased team/deployment coordination.

Evolution:

- Extract only Contracts as a service.
- Keep Passes, Offers, and Reports in the modular monolith.
- Replace in-memory cross-process communication with external messaging.
- Add inbox/outbox reliability because duplicate or lost messages have material consequences.

Key lesson: a hybrid topology can be the right endpoint. Extraction introduces network, operational, contract, data, and package-versioning costs.

### Chapter 4: domain complexity

Signals:

- Contracts gained rapidly changing rules for binding contracts and annexes.
- Invariants had to remain consistent, including under concurrency.

Evolution:

- Apply tactical DDD only to Contracts.
- Use an aggregate root to guard annex invariants.
- Model identity-bearing concepts as entities, descriptive concepts as value objects, and meaningful state changes as domain events.
- Leave typical CRUD and reporting modules simple.

Key lesson: tactical DDD responds to business complexity, not to service boundaries or technical fashion.

## Concrete fitness-function examples in the repository

Chapter 1 contains automated architecture tests that forbid module dependencies and constrain event-only communication between selected modules. This is the practical evolutionary mechanism: the intended boundary is executable and fails with the build when code drifts.

## Adaptation guardrails

- Translate namespaces and .NET projects into the target ecosystem's package/module mechanisms.
- Reassess data-loss tolerance; do not repeat the in-memory event choice for critical workflows.
- Do not copy the project's integration-event sharing if it prevents consumer autonomy.
- Treat the chapter sequence as one context-specific history, not a universal maturity ladder.
