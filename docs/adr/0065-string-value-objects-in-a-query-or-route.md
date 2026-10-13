# ADR 0065 — A string value object can be read from a query or a route, by opt-in

Status: accepted (2026-10); amends [ADR 0055](0055-shared-string-value-objects.md), whose consequence was that a shared
value object does not bind from a route or a query

## Context

The search term of the clients list (`q`) is free text that has to be normalized for the application: trimmed,
lowercased, blank meaning "no search", and bounded in length. As a plain `string?` the handler did the normalization
and a validator rule did the bound. The architecture asks for the opposite: a request carries the shared string value
objects, which own their rules ([ADR 0055](0055-shared-string-value-objects.md),
[ARCHITECTURE](../../backend/docs/ARCHITECTURE.md) §2 and §3).

The kernel reads those types from a JSON body only. Probes with this repository's ASP.NET Core and OpenAPI setup:

- A value object as a member of a `[FromQuery]` record is bound as a complex object. `?q=maria` does not reach it.
- The API explorer flattens such a member, so the document published `Q.Value` as the query parameter instead of `Q`.
  A client generated from it would send `?Q.Value=maria`.
- MVC binds an `IParsable` type from a query, but with its own English message that echoes the value; ADR 0055 rejected
  `IParsable` for that reason, and also because "a CPF in a URL is not wanted": a URL ends up in access logs.

## Decision

**`SearchText`**, a shared string value object in `Admin.SharedKernel.ValueObjects`: trimmed, lowercased with the
invariant culture, at most 254 characters, and its pt-BR message when it is too long. The 254 is the longest thing a
list searches (an e-mail).

**A blank text is a valid `SearchText`.** Every other string value object refuses a blank in `Create`, because a blank
is not a value of a CPF or a name. An empty search is different: it is a search with nothing in it, and a user filtering
by another field sends exactly that. `Create(null)`, `Create("")` and `Create("   ")` succeed with the empty value
(`IsEmpty`). The type keeps `BlankIsAbsent` at its default, so the binder and the converter still turn a blank
parameter into `null`; the member is nullable, and an absent parameter, a blank one and an empty instance all mean "do
not filter by text". The handler reads the three the same way.

The exception is explicit in `StringValueObjectContractTests`, which lists the types that accept a blank text. The only
generic code that assumed `Create(null)` fails, the JSON converter's answer to a token that is not a string, now falls
back to "O valor informado deve ser um texto." when `Create(null)` succeeds.

**The opt-in is a type converter.** `StringValueObjectTypeConverter<T>`, in the same project and built only on the
base class library, converts a `string` through `Create`. A type declares
`[TypeConverter(typeof(StringValueObjectTypeConverter<T>))]` to say that it may travel in a URL. The declaration does
two things:

- MVC and the API explorer read the type as one value, so the document says `Q`, a `string`, with no extra schema;
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

**`ListClientsQuery.Q` is a `SearchText?`.** The validator lost its length rule and the handler its normalization: the
handler reads `query.Q?.Value`. The digits of a CPF mask stay in the handler, because they are a rule of the clients
search and not of a text.

## Consequences

- A term longer than 254 characters now fails at binding: `400 Validation.Failed` under `q`, with the message "A busca
  deve ter no máximo 254 caracteres.". The code `Client.SearchTooLong` of the first version never reached a merged build.
- The generated frontend types do not change: `q` is still a `string`.
- Other free-text searches (`Search` of services, tags and categories, each trimmed in its repository) can adopt
  `SearchText` when their lists are touched. That is the second caller that justifies the shared type; none is converted here.
- The probe of the document is a test: `StringValueObjectContractTests` fails if `SearchText` becomes a complex type
  to MVC again, and the provider tests fail if personal data starts binding from a URL.
- A date value object is not bound from a URL. This ADR covers strings.
- `AddWireJson()` is called by every service, so the provider reaches `identity-service` too; it binds nothing there,
  since no parameter of that service is a declaring type.

Verified by hand on a disposable PostgreSQL 18.3 with the real services and a real login: 94 checks on the list,
including a term of 255 characters (`400`, the message of the value object, the term not echoed), a padded term of
254 characters after the trim, `q` given twice, `?Q=` in another case and a blank `q`; the generated document with
`Q` as a `string`; and the generated frontend types equal to a fresh generation.

## Considered and rejected

- **Binding every shared string value object from a URL.** One line of registration and nothing to opt into, but it
  opens `[FromQuery] CpfNumber` for any future action, against ADR 0055.
- **`IParsable<T>`.** English text that echoes the value, and no message of the type's own (ADR 0055).
- **A `TypeConverter` alone, without a binder.** MVC turns a conversion failure into its English text, or keeps the
  exception without a message; the problem shape would not show the message of the value object.
- **An OpenAPI transformer that renames `Q.Value` to `Q`.** Name surgery on a flattened parameter, with no hook for
  the type behind it.
- **`TypeDescriptor.AddAttributes` for every value object at startup.** Process-wide state, and it opens every type,
  personal data included.
- **A client-specific term type carrying the text and the CPF digits.** A request carries the shared string value
  objects and nothing else of the domain, and the CPF digits are a rule of one search.
- **`q` as a plain string normalized in the handler** (the first version of this change). It works, but the rule sits
  in the use case and in a validator rule instead of in the type, which is how every other shared text is carried.
