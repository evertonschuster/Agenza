---
name: agenza-backend-review
description: Use when reviewing a backend change — a PR, branch or diff touching backend/services/ or backend/shared/ — or self-reviewing your own backend work before opening a PR. Judges it against backend/docs/ARCHITECTURE.md (aggregate boundaries, rich domain, handler-owned orchestration, simple repositories over the DbContext's filters, clean validation, factories, DTOs, no premature optimization) and writes severity-ranked findings in pt-BR.
---

# Reviewing a backend change

Early slices set the rules: whatever a merged slice does, the next one copies. Review the **precedent**,
not only the bug — a shape that is harmless today and wrong as a pattern is a finding.

The rules are in [`backend/docs/ARCHITECTURE.md`](../../../backend/docs/ARCHITECTURE.md); how each piece
should be written is in the `agenza-backend-slice` references, each ending in a "Red flags" list. This
skill is the order of the review and the way to report it.

## 1. Scope the change

```bash
git diff --stat main...HEAD -- backend/
git diff main...HEAD -U0 -- backend/ | grep '^+' | grep -v '^+++'
```

For your own uncommitted work, diff against `main` without `...HEAD`. Sort the files by layer (Domain,
Application, Infrastructure, Api, Tests, Migrations). Note every file
that ARCHITECTURE §10 lists in its "older shape" column: touching one obliges converting the touched
part.

## 2. Grep the added lines

Cheap, and it catches most of what matters. Each hit is a question, not a verdict.

| Pattern on an added line | Where | Why it is a flag | Default |
| --- | --- | --- | --- |
| `TenantId` | Application, Api, a repository signature | tenant threaded by hand — load `agenza-tenant-isolation` | Bloqueante |
| `IgnoreQueryFilters`, `DeletedAt`, `TenantId ==` | repositories | the `DbContext` owns those filters | Bloqueante |
| `[IgnoreTenant]` | Api | a first use has to justify itself | Bloqueante |
| `DropColumn`, `DropTable`, `RenameColumn`, `AlterColumn` | migrations | existing data at risk | Alta |
| `try {`, `catch (` | Application | business flow as an exception | Alta |
| `throw new` | Domain, Application | only programmer-error guards throw (§4) | Alta |
| `MustAsync`, `CustomAsync`, `Repository`, `DbContext` | `*Validator.cs` | a validator with I/O | Alta |
| `{ get; set; }`, `public void Set` | Domain | state changed without a rule | Alta |
| a public constructor | Domain | bypasses `Create` | Alta |
| a property or collection typed as another root; `Include` of another root | Domain, repositories | a navigation between aggregates | Alta |
| `class …Loader`, `…Manager`, `…Service`, `…Helper`; `abstract class …Handler` | Application | orchestration outside a handler | Alta |
| `DbContext`, `IDispatcher`, `HttpContext`, `ITenantAccessor` | a handler | a handler reaching past its ports | Alta |
| `DateTime.Now`, `DateTime.UtcNow`, `DateTime.Today`, `TimeZoneInfo` | anywhere | UTC through `TimeProvider` (§7) | Alta |
| `AutoMapper`, `Mapster`, `.Adapt<` | anywhere | mapping is `ToModel` and `From<Entity>` | Alta |
| `SqlQuery`, `FromSql`, `ExecuteSql`, `BeginTransaction`, `IMemoryCache`, `Task.WhenAll` | Application; Infrastructure outside the service's `UnitOfWork` (its transaction shape is decided, ADR 0005) | an optimization — where is the evidence? | Média; Alta when it adds a mechanism with none |
| `Select(` building a `…Response`, `…Summary` or `…Dto` | repositories | a projection inside a repository | Média |
| `class …Factory`, `class …Builder` | Domain, Application | factories are static methods on the type | Média |
| `new DomainError(` inside a method | Domain | an unnamed error | Média |
| a `RuleFor` chain with no `.WithErrorCode` | `*Validator.cs` | FluentValidation's internal name leaks to the API | Média |
| a domain type as a member (a shared string value object such as `CpfNumber` is fine, ADR 0055; so is a plain enum named by a registered converter, ADR 0058) | commands, inputs, responses | the wire carries strings and primitives | Média |
| a list of enums with no `IsInEnum` rule, an enum registered in the MVC JSON options but not in the minimal-API ones, a `<Concept>Names` class | validators, `Program.cs`, Application | an unvalidated value reaches the response; the OpenAPI publishes `integer`; the translation is redundant (ADR 0058) | Média |
| `//`, `///` | anywhere | "what" comments are not allowed | Baixa |

## 3. Read it, in this order

Evaluate every step even after an early finding — each is an independent way to go wrong.

1. **Safety.** Tenant (every layer fails closed), data loss in a migration, a contract change without
   regenerated frontend types.
2. **Boundaries.** Project references; aggregate boundaries (references by id, children only through
   their root, one repository per root); orchestration only in handlers.
3. **Domain richness.** Value objects by the threshold in §3; behaviour named after intention with
   refused transitions; factories as static methods; one named error per rule.
4. **Use case.** The five gates in order; pre-checks before side effects; field conflicts with `meta`;
   generic save failure; DTOs with no domain type but the shared string value objects.
5. **Persistence.** Repository returns and parameters; configuration against §5; the migration's `Up`
   and `Down` read line by line.
6. **Simplicity.** Anything added for performance, flexibility or "the next feature": ask what measured
   problem or product rule it answers. An unused port method, parameter or abstraction is a finding.
7. **Tests.** Each rule and branch proved at the right tier (`agenza-backend-slice`
   references/tests.md); PostgreSQL-only guarantees verified by hand and reported in the PR.
8. **Docs.** A new decision has an ADR; a rule change updated ARCHITECTURE; a better example updated
   §10; no doc gained a feature list.
9. **Style.** Block bodies with guard clauses (§8), names.

## 4. Prove what you claim

A claim backed by a run beats an argument. Cheapest first:

- `dotnet build backend/AdminBackend.slnx -c Release` and `dotnet test backend/AdminBackend.slnx -c Release`;
- `dotnet ef migrations has-pending-model-changes` (command in ARCHITECTURE §5);
- a failing unit test written to show the case, or a short probe — then leave the tree as you found it.

Say which findings were proved and which are reasoned.

## 5. Severity

| Severity | When |
| --- | --- |
| **Bloqueante** | another tenant's data readable or writable, data loss, a broken contract without regenerated types, a red build or test |
| **Alta** | a boundary broken (layer, aggregate, error gates, orchestration outside the handler) or a mechanism added without evidence. In new code this becomes precedent, so it is Alta even with no visible bug |
| **Média** | a divergence from the reference with no immediate risk: a missing value object by the threshold, a validator without codes, an unnamed domain error, a test at the wrong tier |
| **Baixa** | names, style, comments |

## 6. Write the findings

In pt-BR, most severe first. Each finding:

- `[Severidade] título curto`
- `arquivo:linha`
- what happens, as a concrete scenario — "um `PUT` com a mesma etiqueta duas vezes grava…", not
  "viola DDD";
- the rule it breaks (ARCHITECTURE §n, ADR nnnn);
- the direction of the fix, and which layer should own it.

Deliver the findings for discussion; do not fix unasked. End with what the review did not cover.
