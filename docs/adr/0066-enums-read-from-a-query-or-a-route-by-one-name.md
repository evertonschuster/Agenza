# ADR 0066 — An enum is read from a query or a route by one name

Status: accepted (2026-10); extends [ADR 0058](0058-closed-set-members-are-plain-enums.md) (enums bound by name, integers
refused) from a JSON body to a query and a route; replaces the bit values of `ClientStatusFilter` in
[ADR 0063](0063-clients-list-and-search-contract.md)

## Context

ADR 0058 names every enum in camelCase on the wire and refuses integers, but only in a JSON body. An enum read from a
query or a route went through the framework's binder, which parses with `EnumConverter`:

- it accepts the number of a member (`?status=3`), which the body refuses;
- it joins names separated by a comma with an OR, even for an enum that is not `[Flags]`, and accepts the join when the
  result is the value of a member. A probe on this repository's runtime: with `Active = 1, Inactive = 2, All = 3`,
  `active,inactive` becomes `All` and `inactive,all` becomes `All`, both members, so neither the binder nor `IsInEnum` sees
  anything wrong;
- an unknown name answers in English and echoes the value ("The value 'deleted' is not valid.").

The clients list ([ADR 0063](0063-clients-list-and-search-contract.md)) dodged the join with values chosen as bits
(`1, 2, 4`), so that every join is a value no member has. It worked for that enum, but it is a convention the next filter
would have to know, nothing pins it, and numbers stayed accepted.

## Decision

**`EnumNameModelBinderProvider`**, in `Admin.SharedKernel.AspNetCore`, registered by `AddWireJson()` right after the
binder of string value objects ([ADR 0065](0065-string-value-objects-in-a-query-or-route.md)) and before every binder of
the framework, so no service has to remember it. It gives every enum, nullable or not, read from anything but the body
(a query, a route, a header, a form field) a binder that:

- binds nothing when the parameter is absent, so the member keeps its default;
- binds `null` for a blank value of a nullable enum, and refuses a blank one for an enum that is not nullable;
- accepts exactly one name of a member, trimmed and in any case: the camelCase name of the wire and the PascalCase name of
  the code are the same text ignoring case;
- refuses anything else — a number, several names, an unknown name — with a model error under the parameter, "O valor
  informado deve ser active, inactive ou all.", built from the camelCase names of the members. The canonical problem
  answers it as `400 Validation.Failed` ([`docs/API.md`](../API.md) §4.3), and the message never carries the value.

A parameter that comes from the body is left to the JSON converters (ADR 0058), unchanged.

**Enum values are free again.** No value has to be chosen to keep the parser away from a member: `ClientStatusFilter`
goes back to `Active = 1, Inactive = 2, All = 3`, and `ListClientsQueryValidator` loses its `IsInEnum` rule and the
literal code `Client.StatusFilterInvalid`, because no value that is not a member can reach it from the query.

## Consequences

- `GET /api/v1/clients?status=3` and `?status=active,inactive` answer `400 Validation.Failed` under `status`; before,
  the first was `all`, and the second a `400` in English only because of the bit values. An unknown name keeps the `400`,
  now in pt-BR and without the value.
- The OpenAPI document does not change: the API explorer reads the metadata of the parameter, not its binder. The
  generated frontend types stay the same.
- It reaches every service that calls `AddWireJson()`. `identity-service` does not call it and keeps the framework's
  binder.
- A list of enums in a body still needs `IsInEnum` per item (ADR 0058): the JSON converter can still yield a joined value.
- A `[Flags]` enum read from a URL would need several names. None exists, and ADR 0058 keeps a set of options out of
  `[Flags]`; a first one would amend this ADR.

Verified with the kernel's tests: the provider and the binder on their own (each case above, the message, no echo), and
the MVC parameter binder built by `AddWireJson()` reading a query record, where `status=3` and `status=active,inactive`
on an enum with values `1, 2, 3` answer the canonical `Validation.Failed` under `Status` with the pt-BR message. The
service's OpenAPI document, served on a private port with no database, generates frontend types identical to the
committed ones. The binder was not exercised through an authenticated request to the running service.

## Considered and rejected

- **Values chosen as bits, as ADR 0063 had.** A convention per enum, not pinned by anything, and numbers stay accepted.
- **An `IsInEnum` rule in each validator.** It runs after the binder, when a join is already a member, and cannot tell
  `3` from `all`.
- **An opt-in per enum, like the type converter of ADR 0065.** The opt-in there keeps personal data out of URLs; an enum
  carries none, and an opt-in is one more thing each filter would have to remember.
- **Replacing `EnumConverter` through `TypeDescriptor.AddAttributes` at startup.** Process-wide state that reaches every
  other use of the converter, not only binding.
- **Leaving the framework's binder and documenting the limits** (the version before this one). Every future filter would
  repeat the analysis of ADR 0063.
