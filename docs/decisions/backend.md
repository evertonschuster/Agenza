# Decisions: backend

The conventions live in [backend/docs/ARCHITECTURE.md](../../backend/docs/ARCHITECTURE.md) and the
common wire shapes in [docs/API.md](../API.md); this file keeps the decisions and what was refused.

## Use cases, validation and results

### Decision

- **CQRS with our own dispatcher**, in `Admin.SharedKernel`: it resolves the command's or query's
  handler and runs the validator first. Vertical slices organize the Application, inside the layers
  Domain → Application → Infrastructure → Api.
- **Expected failures are values.** The domain returns `DomainResult`; the Application, `Result`. Only
  the unexpected throws.

Command binding, one handler per operation, shape-only validators, `404`/`409` conflicts, error keys
and untracked reads are conventions of the [backend guide](../../backend/docs/ARCHITECTURE.md), §2 to
§6.

### Why

Proportional abstraction: the whole dispatcher fits in about a hundred lines, and the code reads as
explicit orchestration. The investment goes into the domain (aggregates, value objects, named
errors).

### Rejected

- **MediatR.** From version 13 it requires a commercial license above a revenue threshold; what is
  needed fits in our own dispatcher.
- **Validators with a repository for cross-aggregate rules**, with an anemic domain. It was tried and
  reverted: it hid I/O in validation and took the invariants out of the domain.
- **A loader shared between handlers** (`ServiceRelationshipLoader`). It becomes an orchestration
  layer each feature tends to fatten; the repository already is that boundary.
- **Business exceptions and monadic helpers over `Result`.**
- **Messages derived from the database constraint's name.** The specific answer comes from the
  handler's pre-checks; a retry goes through them.
- **`<Feature>RuleBuilderExtensions` for shared rules.** It required deciding case by case what to
  extract; the domain's constants and codes already align the copies.
- **`GetForUpdateAsync` on the port.** It ties the Application to EF's loading strategy.
- **Navigations between aggregates** to ease responses: they couple two consistency boundaries.
- **Generic CRUD, a base handler, builder/factory classes and mapping libraries.** Structure without a
  problem asking for it; mapping is a `From<Entity>` method.
- **Performance mechanisms without a measured need.**
- **A registry of usage providers for tag deletion, or just a checklist.** A registry can be
  forgotten too and a checklist does not detect the forgotten relationship;
  `TagDeletionUsageCoverageTests` compares each foreign key to `Tag` with a deletion scenario.

## Domain modeling and API contracts

### Decision

- **A rich domain per aggregate.** Behavior with intent, children created only by their root,
  aggregates that reference each other by id, value objects for whatever has a format or a rule,
  soft delete as the only deletion and uniqueness decided by the database index. The rules are in
  the [backend guide](../../backend/docs/ARCHITECTURE.md), §3, §5 and §6.
- **An edit (`PUT`) replaces the whole record, children included.**

### Rejected

- **A `Deleted` status beside the soft delete.** Two sources of truth, and the status alone did not
  hide the row.
- **A contacts table with a discriminator.** Nullable columns that apply to only one kind.
- **Reserving a CPF forever**, even for deleted people. A product decision: deleting frees it.
- **Syncing children by id on edit.** It reconciles technical identity when the request already
  carries the whole desired state.
- **A value object for a set of options**, a converter registered per enum, `[JsonConverter]` in the
  domain and flag enums. Forgetting a registration failed silently, and flags accepted combinations.
- **A shared paging validator or a generic specification in the repository.** Each list has its own
  filters, and the port receives plain values.
- **A non-paged list mode**, refused by the owner.
- **Age on the wire.** It ties the answer to the day it was computed.
- **Masking the CPF**, the owner's decision.
- **`409` for a repeated action.** A second click would turn the state the user wanted into an error.
- **Tags as `uuid[]` in the people table.** PostgreSQL has no foreign key on an array element, and
  tenant ownership would live only in the application.
- **A direct navigation between `Client` and `Tag`.** It would load another root inside the
  aggregate.

## Dates and time zones

### Decision

- **A calendar date sent as an instant keeps the written day.** A date value object accepts
  `2015-03-10T23:59:59-03:00` as March 10, ignoring time and offset. The rest stays with the
  framework.
- **In the frontend, the order and format of typed and displayed dates follow the browser's
  language**; text and numbers follow pt-BR.

A rule that depends on the business's local day needs a new decision.

### Rejected

- **Converting the date in the frontend repository** and keeping the contract strict. The owner
  preferred relaxing the backend to changing the type generator.
- **Using the UTC day of the received instant.** The owner asked for the date as written.
- **Fixing the date order to pt-BR.** A user with the browser in another language reads and types in
  their own order.
