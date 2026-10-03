# ADR 0047 — Validation rules live in the domain; validators name the field

Status: accepted (2026-10); refines [ADR 0012](0012-revert-cross-aggregate-checks-to-handlers-and-domain.md) for
rules the domain also enforces

## Context

[ADR 0012](0012-revert-cross-aggregate-checks-to-handlers-and-domain.md) has FluentValidation check the shape of the
input and the domain re-check the same invariants as defence in depth, so every rule is written twice. In #154 the two
copies had already drifted: the same `code` answered a different pt-BR message depending on which layer caught the
problem (`FullName.InvalidLength` was "deve ter pelo menos 2 caracteres" in the validator and "deve ter entre 2 e 150
caracteres" in `FullName`), and the value objects had grown public helpers (`CpfNumber.IsValid`,
`EmailAddress.HasValidShape`, `BirthDate.IsInThePast`) whose only caller was the validator restating their rule.

## Decision

A rule and its pt-BR message are written once, in the domain: the value object's `Create`, or a static check on the
entity for a rule that spans fields (`Client.ValidateGuardians`, `ClientContact.ValidateName`). The validator calls that
same function through `MustBeValid` (`ServicesService.Application/Abstractions/DomainRuleBuilderExtensions.cs`), which
turns a failed `DomainResult` into a failure on the property being validated, carrying the domain's `code` and message:

```csharp
RuleFor(command => command.Cpf).MustBeValid(CpfNumber.Create);
```

The validator keeps what only it can do: name the field (`Cpf`, `Guardians[0].Name`) and collect every problem in one
answer. Rules of its own are structural only, with no domain counterpart (a `null` item in a list, a purpose name the
API does not know).

The use case still builds the aggregate through the same functions (`ToModel`), so the domain remains the last check.
They are pure and cheap; running them twice is the price of naming the field.

Clients follows this now. Tags, Categories and Services move to it when they are next touched, which also replaces their
generic codes (`Tag.Invalid`, `NotEmptyValidator`) with the domain's.

## Consequences

- One rule, one message: the validator can no longer drift from the domain.
- Domain messages are user-facing copy, so they follow the pt-BR copy rules. A contact's message names the contact
  generically ("O nome do contato é obrigatório.") rather than its role ("do responsável").
- Helpers that existed only for the validator to restate a rule are gone from the value objects.
- The rest of ADR 0012 stands: cross-aggregate checks stay in handlers, and validators take no repositories.
