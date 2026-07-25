# Architectural fitness functions

## Contents

1. Design rules
2. Modular fitness catalog
3. Distributed fitness catalog
4. Quality attributes
5. Rollout

## Design rules

Define each fitness function with:

- Characteristic being protected.
- Observable rule and threshold.
- Scope.
- Automation mechanism.
- Cadence.
- Owner.
- Failure response.
- Expiry or review condition.

Prefer fast deterministic checks in pull requests, broader integration checks in CI, and runtime checks for properties that static analysis cannot prove.

## Modular fitness catalog

### Dependency direction

Rule: modules may depend only on declared public contracts; forbidden edges and cycles fail CI.

Possible mechanisms:

- .NET: NetArchTest, ArchUnitNET, project-reference checks.
- JVM: ArchUnit, jQAssistant.
- TypeScript/JavaScript: dependency-cruiser, Nx module-boundary rules, Madge.
- Python: import-linter.
- Go: package/import graph checks.
- Language-neutral: graph extraction plus a checked-in allowlist.

### Encapsulation

Rule: internal types remain inaccessible outside the owning module. Public surface growth requires review.

Measure exported symbols, package/API baselines, or visibility conventions. Fail on unapproved additions.

### Data ownership

Rule: only the owning module may write its schema/tables.

Enforce with separate credentials, database grants, migration ownership, static query checks, or integration tests. Runtime database permissions are stronger than naming conventions.

### Contract isolation

Rule: consumers depend on public DTOs/events, not persistence entities or internal domain objects.

Check references/imports and package dependencies. Keep shared business contracts narrow and versioned.

### Vertical cohesion

Rule: a change to one business capability should not require routine edits across unrelated modules.

Track change coupling from version history. Use the trend as a review signal, not an automatic failure until a stable baseline exists.

### Architecture documentation

Rule: changes to deployment, public contracts, data ownership, or allowed dependencies require a current ADR and diagram/map update.

Automate path-based pull-request checks where practical.

## Distributed fitness catalog

### Contract compatibility

Run consumer-driven or schema compatibility tests before publishing. Reject breaking changes outside the declared compatibility policy.

### Resilience

Test timeout, retry budget, circuit breaking, duplicate delivery, reordering, poison messages, and dependency unavailability. Verify bounded retries and visible dead-letter handling.

### Message reliability

For critical asynchronous flows, verify:

- Outgoing state change and outbox record are atomic.
- Consumers are idempotent or deduplicate.
- Failed messages are observable and replayable.
- Reconciliation detects missing or divergent outcomes.

### Independent deployability

Measure whether a service can build, test, deploy, and roll back without coordinated release. Repeated coordinated deployments are evidence of a distributed monolith.

### Runtime coupling

Set a maximum synchronous call depth and latency budget for critical paths. Trace and alert on violations.

## Quality attributes

Examples:

| Characteristic | Example fitness function |
| --- | --- |
| Performance | Module-specific p95/p99 under expected load remains within an explicit budget |
| Scalability | Load test proves the candidate module scales independently before extraction is accepted |
| Availability | Synthetic transaction and SLO burn-rate alerts cover the critical business flow |
| Security | Automated authorization, dependency, secret, and boundary tests run in CI |
| Maintainability | Forbidden dependencies are zero; cycles are zero; public surface stays within baseline |
| Evolvability | A representative change can be delivered without edits to unrelated modules |
| Operability | Dashboard, alert, runbook, trace propagation, and rollback drill exist before service cutover |
| Cost | Cost per transaction or tenant remains below an agreed threshold |

Do not confuse a proxy with the goal. Project count, coverage percentage, and service count are not architectural outcomes on their own.

## Rollout

1. Baseline current behavior without failing builds.
2. Select a small set protecting the highest-risk decisions.
3. Ratchet thresholds so new violations fail while legacy debt is tracked.
4. Assign ownership and remediation time.
5. Review noisy or obsolete checks.
6. Add a fitness function in the same change that establishes a new boundary.
