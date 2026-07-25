# Incremental architecture migration playbook

## Contents

1. Preconditions
2. Module boundary repair
3. Project/package separation
4. Service extraction
5. Data separation
6. Integration migration
7. Cutover and rollback

## Preconditions

- Define target outcome and non-goals.
- Establish characterization tests around behavior being moved.
- Capture traffic, errors, latency, data volume, and change/deployment baseline.
- Define the new owner, public contract, data ownership, and fitness functions.
- Choose a thin vertical slice with low blast radius.
- Create an ADR before an expensive or cross-team commitment.

## Module boundary repair

1. Inventory cross-boundary dependencies and foreign data access.
2. Classify each dependency as command, query, event, or accidental code reuse.
3. Choose the owner based on business capability.
4. Introduce a narrow public contract at the seam.
5. Move one caller at a time.
6. Add a forbidden-dependency and data-ownership check.
7. Remove the old path only after usage is zero.

Use branch by abstraction when callers cannot move atomically. Avoid a generic service layer that merely hides the same coupling.

## Project/package separation

1. Make the logical boundary clean before moving files.
2. Define internal and public namespaces/packages.
3. Break cycles through ownership changes or explicit contracts; do not create a shared dumping ground.
4. Extract the module and its tests.
5. Keep composition at the application edge.
6. Verify build graph, test isolation, and public surface.

Do not split all modules uniformly. Separate only those that need stronger physical boundaries.

## Service extraction

1. Revalidate disintegrators, integrators, and operational readiness.
2. Select one capability and one entry path.
3. Establish an internal API or message seam while code remains in-process.
4. Remove cross-module database writes.
5. Give the candidate ownership of its data and migrations.
6. Deploy the service dark with observability.
7. Shadow, mirror, or canary traffic where semantics permit.
8. Route a small cohort or operation through the service.
9. Reconcile outcomes and compare SLOs.
10. Increase traffic gradually.
11. Retire old code only after the rollback window.

Do not extract code first and discover transaction or data boundaries later.

## Data separation

Use expand-migrate-contract:

1. Expand schemas/contracts compatibly.
2. Backfill with resumable, observable jobs.
3. Dual-read or compare reads if needed.
4. Dual-write only with a clear source of truth, idempotency, and reconciliation; avoid indefinite dual-write.
5. Switch ownership and reads.
6. Monitor drift.
7. Contract old schema/fields after the compatibility window.

Document:

- Source of truth at every phase.
- Conflict resolution.
- Backfill checkpoints.
- Privacy and retention effects.
- Rollback limits after new writes begin.

## Integration migration

### Direct call to in-process event

Use only if delayed execution is acceptable. Define handler failure behavior; in-memory delivery is not durable.

### In-process to external messaging

Add:

- Stable event semantics and versioning.
- Transactional outbox where loss matters.
- Idempotent consumer/inbox where duplicates matter.
- Retry policy, dead-letter handling, tracing, alerting, and replay.
- Contract tests and reconciliation.

### Synchronous remote call

Add:

- Timeout and retry budget.
- Idempotency for retried commands.
- Circuit breaking or load shedding where justified.
- Clear partial-failure semantics.
- Trace propagation and latency budget.

Avoid synchronous chains across several services.

## Cutover and rollback

Define before deployment:

- Entry and exit criteria for every stage.
- Metric thresholds that halt or reverse rollout.
- Feature flag or routing control.
- Data reconciliation query.
- Maximum rollback point after schema or data ownership changes.
- Named operator and communication channel.

After cutover, verify that independent deployment, scaling, or ownership benefits actually occurred. If coordination and coupling remain, treat that as evidence to improve or reverse the boundary.
