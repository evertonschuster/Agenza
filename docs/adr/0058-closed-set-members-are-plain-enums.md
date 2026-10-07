# ADR 0058 — A closed set of independent options is a plain enum, bound by name

Status: accepted (2026-10); supersedes the `ContactPurposes` value object, the `ContactPurposeNames`
translation and the "never as JSON enums" wire rule that [ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md)
recorded for reference-contact purposes

## Context

A reference contact has a set of purposes (`emergency`, `operationalSupport`, `dailyCommunication`).
ADR 0044 modelled it as a `[Flags]` enum wrapped by a `ContactPurposes` value object, and carried it on the
wire as a list of strings that `ContactPurposeNames` translated into the flags value. That kept the
framework's English binding error away from the client, at the price of a translation class in each
direction, a validator rule that restated the catalog, and a value object whose only job was
"at least one".

Three things in that shape did not pay for themselves. The value object wrapped a bitmask only because
the column stores one; the domain did not need it. The same names lived in the translation class and in
the enum. And the unknown-name rule was a second copy of what the binder already knows.

## Decision

- `ContactPurpose` is a plain enum (no `[Flags]`, no `None`) with explicit values `1`, `2`, `4`. The
  values are the persisted codes, so they never change.
- The `ContactPurposes` value object and `ContactPurposeNames` are removed. A reference contact holds
  `IReadOnlySet<ContactPurpose>`; `ClientReferenceContact.Create` and `Update` refuse an empty set
  (`ClientReferenceContact.PurposesRequired`) and a value that is not a member
  (`ClientReferenceContact.PurposeUnknown`), and keep their own copy of the set.
- Commands and responses carry `IReadOnlyList<ContactPurpose>`. The shared kernel names **every** enum
  on the wire in camelCase and refuses integers: `JsonSerializerOptions.AddEnumNameConverter()`
  (`Admin.SharedKernel`), which `AddWireJson()` (`Admin.SharedKernel.AspNetCore`, formerly
  `AddValueObjectJson()`) registers in both the MVC and the minimal-API JSON options — the OpenAPI
  generator reads the latter and would otherwise publish the enum as `integer`. A service that already
  calls `AddWireJson()` registers nothing per enum. An unknown name now fails at binding (gate 1), with
  the framework's English message and the generic code `Validation.Failed`.
- The validator keeps two rules per input: the list is not null or empty (`PurposesRequired`), and each
  item is a member (`PurposeUnknown`, `IsInEnum`). The second exists because the converter accepts several
  names in one string (`"emergency, operationalSupport"`) and yields a value that is not a member of the
  enum; without it that value would reach the response, where the converter refuses to write it.
- Storage does not change: the column stays an `int` with `CHECK BETWEEN 1 AND 7`, and the EF
  conversion maps the set to the sum of its codes and back, with a comparer by set equality. A stored
  `0` reads back as an empty set. No migration.

## Consequences

- The wire contract changes in the generated types: `purposes` is a list of
  `'emergency' | 'operationalSupport' | 'dailyCommunication'` instead of `string[]`. Requests that
  were valid stay valid; a name outside the catalog is still rejected, now with the binder's message.
- The error code for "no purpose" changes from `ContactPurposes.Required` to
  `ClientReferenceContact.PurposesRequired`, and `ContactPurposes.Unknown` becomes
  `ClientReferenceContact.PurposeUnknown` (only for the combined-string case). No client branched on
  them.
- Repeated names are tolerated and collapse to one; the response lists the purposes in the enum's order.
- The rule is general. An enum on a request or a response is a plain enum, named in camelCase on the
  wire by the kernel's converter with integers refused; no `<Concept>Names` translation class and no
  converter per enum. No enum was on the wire before this change, so none changes shape. A closed set of independent options with no rule beyond membership and a minimum
  size is that enum in an `IReadOnlySet` on the entity, not a value object. A closed set that carries a
  rule of its own (a palette with a format) stays a value object.
- An enum member of a request needs a validator rule `IsInEnum` per item, with the domain's code, because
  the converter can yield a value that is not a member.

## Considered and rejected

- **A JSON converter for the whole `ContactPurposes` value object.** It needs a converter for an array,
  a schema mapping so the OpenAPI does not publish an object, and an exception to the rule that
  commands carry no domain type, to save one validator rule.
- **A converter registered per enum, or per feature.** It was the first version of this change; each new
  enum would repeat the same two registrations, and forgetting the second one is silent (the API works,
  the OpenAPI says `integer`).
- **A `[JsonConverter]` attribute on the enum.** It puts a wire concern in the Domain, which does not
  know the wire format.
- **A custom strict converter that refuses combined names.** It removes the `PurposeUnknown` rule at
  the cost of a hand-written converter and its tests; the validator rule and the domain guard follow
  the pattern the other inputs already use.
- **Storing the set as a child table or an array column.** It makes the model more relational but needs
  a data-moving migration, which the additive-only rule forbids for no product reason.
