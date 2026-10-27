# Select backend tests

The [architecture](../../../../backend/docs/ARCHITECTURE.md#9-tests) defines the available tiers and
their limits. The [backend README](../../../../backend/README.md) owns execution commands;
[QUALITY](../../../../docs/QUALITY.md) explains coverage.

| Changed behavior                              | Useful evidence                                                                     |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| Domain rule, normalization or transition      | Direct test of allowed/refused input and unchanged state after rejection            |
| Request validation                            | Code and property for the invalid input; valid request still accepted               |
| Handler outcome                               | Result, field metadata and repository/save interactions at success or rejection     |
| Wire parsing or mapping                       | JSON binding through the configured options; actual serialized output when relevant |
| Tenant assignment, query filter or conversion | Focused persistence test, with contexts scoped to different tenants when needed     |
| Database-only constraint or race              | Reproducible disposable-PostgreSQL scenario, according to the current policy        |

Choose the boundary that would detect the regression; do not add a test solely because a filename
changed. For a handler rejection, prove that nothing reaches the relevant persistence side effect.
For a failed save, prove the generic use-case Result. For a field conflict found by a pre-check,
assert that its code, field and recovery metadata reach the caller.

## Reuse the live setup

Inspect the relevant files under
[Clients tests](../../../../backend/services/services-service/ServicesService.Tests/Clients/)
and [ClientPersistenceTests](../../../../backend/services/services-service/ServicesService.PersistenceTests/ClientPersistenceTests.cs).
Use the existing fixture/builders, NSubstitute conventions and fixed TimeProvider; make the case
state what changes from the baseline. Assert stable codes and field paths; assert message wording
when the message itself is the behavior.

A shared value object has tests in
[Admin.SharedKernel.Tests](../../../../backend/shared/Admin.SharedKernel.Tests/);
its endpoint binding still needs evidence when that boundary changes. Avoid testing a private
helper directly or copying the same invariant into several tests at the same tier.

## State what the check proves

EF InMemory can exercise query filtering, assignment and conversion paths. Model metadata can show
that an index or FK is configured. Neither demonstrates PostgreSQL enforcing a composite FK,
filtered unique index or CHECK under writes/concurrency.

Use the current [verification policy](../../../../backend/docs/ARCHITECTURE.md#11-what-enforces-what)
for guarantees outside the automated tiers. A new relational-test layer is a separate decision;
do not silently introduce it during a documentation or small feature change.
Run the affected test/gate when executable behavior changed. For documentation alone, validate
links, skill format and diff without starting the application or claiming its tests passed.
