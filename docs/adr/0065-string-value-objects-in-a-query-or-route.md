# ADR 0065 — A string value object can be read from a query or a route, by opt-in

Status: accepted (2026-10); amends [ADR 0055](0055-shared-string-value-objects.md), whose consequence was that a shared
value object does not bind from a route or a query

## Context

The search term of the clients list (`search`) is free text that has to be normalized for the application: trimmed,
lowercased, blank meaning "no search", and bounded in length. As a plain `string?` the handler did the normalization
and a validator rule did the bound. The architecture asks for the opposite: a request carries the shared string value
objects, which own their rules ([ADR 0055](0055-shared-string-value-objects.md),
[ARCHITECTURE](../../backend/docs/ARCHITECTURE.md) §2 and §3).

The kernel reads those types from a JSON body only. Probes with this repository's ASP.NET Core and OpenAPI setup:

- A value object as a member of a `[FromQuery]` record is bound as a complex object. `?search=maria` does not reach it.
- The API explorer flattens such a member, so the document published `Search.Value` as the query parameter instead of `Search`.
  A client generated from it would send `?Search.Value=maria`.
- MVC binds an `IParsable` type from a query, but with its own English message that echoes the value; ADR 0055 rejected
  `IParsable` for that reason, and also because "a CPF in a URL is not wanted": a URL ends up in access logs.

## Decision

**`SearchText`**, a shared string value object in `Admin.SharedKernel.ValueObjects`: trimmed, lowercased with the
invariant culture, at most 254 characters, and its pt-BR message when it is too long. The 254 is the longest thing a
list searches (an e-mail).

**A blank search is an absent one.** `SearchText` follows the contract of every string value object: `Create(null)`,
`Create("")` and `Create("   ")` fail ("Informe um texto para a busca."). The type keeps `BlankIsAbsent` at its default,
so the binder and the JSON converter turn a blank parameter into `null` before `Create` runs; the member is nullable,
and an absent parameter and a blank one both mean "do not filter by text". The query reads `Search?.Value`.

**The opt-in is a type converter.** `StringValueObjectTypeConverter<T>`, in the same project and built only on the
base class library, converts a `string` through `Create`. A type declares
`[TypeConverter(typeof(StringValueObjectTypeConverter<T>))]` to say that it may travel in a URL. The declaration does
two things:

- MVC and the API explorer read the type as one value, so the document says `Search`, a `string`, with no extra schema;
- the kernel's model binder binds exactly the types that declare it.

**`StringValueObjectModelBinderProvider`**, in `Admin.SharedKernel.AspNetCore` and registered first by `AddWireJson()`, so
no service has to remember it, gives a declaring type a binder that:

- binds nothing when the parameter is absent;
- binds `null` for a blank value when the type says `BlankIsAbsent`;
- otherwise calls `Create`, and a failure becomes a model error with the type's own message. The canonical problem
  shape answers it as `400 Validation.Failed` under the parameter ([`docs/API.md`](../API.md) §4.3), and the message
  never carries the value.

A parameter that comes from the body is left to the JSON converters.

**Personal data stays out of URLs.** `CpfNumber`, `EmailAddress`, `FullName`, `PhoneNumber` and
`AdministrativeNotes` do not declare the converter, and a test pins it. A new type that may appear in a URL declares it on
purpose.

**`ListClientsQuery.Search` and `ListServicesQuery.Search` are `SearchText?`.** The validator has no length rule and nothing
normalizes the term again: the query's `ToFilter()` reads its `Value` ([ADR 0064](0064-paged-reads-page-request-and-paged-result.md)).
The digits of a CPF stay in the clients query (`ToFilter()`), because they are a rule of the clients search and not of
a text; the query removes the mask with `CpfNumber.StripMask` ([ADR 0063](0063-clients-list-and-search-contract.md)).

## Consequences

- A term longer than 254 characters now fails at binding: `400 Validation.Failed` under `search`, with the message "A busca
  deve ter no máximo 254 caracteres.". The code `Client.SearchTooLong` of the first version never reached a merged build.
- The generated frontend types change only by the rename of the member: `Search?: string`, as in the other lists.
- The services list, converted to the paged shape in the same change, takes `SearchText` too: the second caller that
  justifies the shared type. Its term was unbounded and matched by an unescaped `ILike`; it is now bounded at binding and
  matched as literal text. Tags and categories keep a `string?` trimmed in the repository until their lists are touched.
- The probe of the document is a test: `StringValueObjectContractTests` fails if `SearchText` becomes a complex type
  to MVC again, and the provider tests fail if personal data starts binding from a URL.
- A date value object is not bound from a URL. This ADR covers strings.
- `AddWireJson()` is called by every service, so the provider reaches `identity-service` too; it binds nothing there,
  since no parameter of that service is a declaring type.

Verified by hand on a disposable PostgreSQL 18.3 with the real services and a real login: 97 checks on the list,
including a term of 255 characters (`400`, the message of the value object, the term not echoed), a padded term of
254 characters after the trim, `search` given twice, `?Search=` in another case and a blank `search`; the generated document with
`Search` as a `string`; and the generated frontend types equal to a fresh generation.

## Considered and rejected

- **Binding every shared string value object from a URL.** One line of registration and nothing to opt into, but it
  opens `[FromQuery] CpfNumber` for any future action, against ADR 0055.
- **`IParsable<T>`.** English text that echoes the value, and no message of the type's own (ADR 0055).
- **A `TypeConverter` alone, without a binder.** MVC turns a conversion failure into its English text, or keeps the
  exception without a message; the problem shape would not show the message of the value object.
- **An OpenAPI transformer that renames `Search.Value` to `Search`.** Name surgery on a flattened parameter, with no hook for
  the type behind it.
- **`TypeDescriptor.AddAttributes` for every value object at startup.** Process-wide state, and it opens every type,
  personal data included.
- **A client-specific term type carrying the text and the CPF digits.** A request carries the shared string value
  objects and nothing else of the domain, and the CPF digits are a rule of one search.
- **A blank text as a valid, empty `SearchText`** (an earlier version of this change, with `IsEmpty`). No request ever
  built one: `BlankIsAbsent` binds a blank to `null` before `Create` runs, from a query and from a body alike. It still
  cost an exception to the contract of every string value object, a fallback message in the generic JSON converter, and a
  branch that turned the empty value into "no search" in every list query. Removed after review.
- **`search` as a plain string normalized in the handler** (the first version of this change). It works, but the rule sits
  in the use case and in a validator rule instead of in the type, which is how every other shared text is carried.
