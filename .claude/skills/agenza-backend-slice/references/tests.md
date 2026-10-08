# Backend tests

Rules: [ARCHITECTURE §9](../../../../backend/docs/ARCHITECTURE.md#9-tests). Tools: xUnit,
AwesomeAssertions (`.Should()`), NSubstitute. Code to copy: the tests of the slices named in §10.

## 1. What goes where

| You wrote | Prove | File |
| --- | --- | --- |
| a value object of the service | every rule; every normalization; blank → `null` when optional; `Restore` does not validate | `<Service>.Tests/<Feature>/<ValueObject>Tests.cs` |
| a shared value object | every rule with its message; every normalization; the boundary of each limit; `Restore` does not validate | `backend/shared/Admin.SharedKernel.Tests/<ValueObject>Tests.cs` |
| an aggregate | every invariant; every transition, allowed and refused; children built and linked to the root; no tenant before save; a failed `Update` changes nothing | `<Service>.Tests/<Feature>/<Entity>Tests.cs` |
| a validator | every rule yields its **code** on its **property**; a valid request passes | `…/<Feature>/<Operation>/<Operation>…ValidatorTests.cs` |
| a handler | success persists and returns the response; each `NotFound` and conflict with code, field and `meta`; a rejection persists nothing; a failed save answers `<Entity>.SaveFailed`; each read happens once | `…/<Feature>/<Operation>/<Operation>…HandlerTests.cs` |
| a command bound from a body | the wire JSON binds; a `tenantId` in the body is ignored | `…/<Feature>/<Operation>/<Operation>CommandBindingTests.cs` |
| a command member typed as a shared value object | the wire JSON binds to it, and an invalid value fails with the type's message under that field | `…/<Feature>/<Operation>/<Operation>Command<ValueObject>BindingTests.cs` |
| tenant assignment, a filter, a conversion, an index, a relationship | the EF behaviour | `<Service>.PersistenceTests/<Entity>PersistenceTests.cs` |
| a response mapping | through the handler's tests, not on its own | — |

## 2. How the tests are written

- Names are `Method_Condition_Expectation`: `Handle_WithDuplicateCpf_ReturnsAFieldConflict`.
- Each class has small builders with defaults (`Command(fullName: …)`) so a test states only what
  matters to it. Data shared by a feature's tests lives in an `internal static <Feature>TestData`.
- Substitutes are fields; the constructor sets the happy path (lookups return `null`, the save
  succeeds) and each test overrides only its case. Interactions are asserted with `Received(1)` and
  `DidNotReceive()` — a rejected command must not reach `Add` or `SaveChangesAsync`.
- Time is a fixed `TimeProvider`. A helper used by a second feature moves to a shared place in the test
  project — not before.
- Every validator rule is one row of a `TheoryData` (case, request, property, code), so a new rule is a
  new row.
- Assert the code. Assert a message only when the message is the behaviour (a limit interpolated into
  it).

## 3. Persistence tests

One EF InMemory context per test, with a substituted tenant provider and current user; two contexts on
the same database for two tenants when the test is about isolation. Model tests (`Model_…`) assert index
definitions, filters, `CHECK`s and composite keys from the model metadata. InMemory proves none of the
PostgreSQL guarantees — a filtered unique index, a `CHECK`, a composite foreign key under writes; those
are verified by hand on a disposable PostgreSQL and reported in the PR.

## 4. Not tested here

The framework (binding attributes, `ProducesResponseType`), the shared kernel (it has its own project),
private methods directly, and the same rule twice at the same tier.

Coverage of Domain + Application is a build gate; a drop below it fails `dotnet test` locally exactly as
in CI. Raise it with tests of rules and branches, never with tests that assert nothing.
