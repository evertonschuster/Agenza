# ADR 0051 — Error keys on the wire are the camelCase path of the request field

Status: accepted (2026-10); supersedes the key casing of the conflict contract in
[ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) (`Cpf`, `Email` → `cpf`, `email`)

## Context

The keys of `errors` in a problem response were the C# property path that FluentValidation's `PropertyName` or a
handler's `Error.Conflict(..., field)` produced: `Name`, `Cpf`, `Guardians[0].Name`. Everything else on the wire is
camelCase: the body the client sends, the properties it reads back, the enum values. A client had to know two names
for each field, and every reader of `errors` compared keys case-insensitively to bridge them. Clients' list fields
made the mismatch visible: `guardians[0].name` goes in, `Guardians[0].Name` comes out.

## Decision

`ApiProblemDetailsFactory` writes every `errors` key as the camelCase of each segment of the path, with the same
policy the JSON body uses (`JsonNamingPolicy.CamelCase`): `Guardians[0].Name` → `guardians[0].name`, `Cpf` → `cpf`,
`MaxDurationMinutes` → `maxDurationMinutes`. The empty key of an application error without fields stays empty.

Inside the backend nothing changes. Validators, handlers and their tests keep C# names (`nameof`,
`OverridePropertyName`, `Error.Conflict(..., nameof(...))`); the HTTP boundary translates, as the JSON serializer
already does for bodies. One place converts, so no slice can get it wrong.

The framework's own 400, when the model binder rejects a body before the dispatcher runs
([API.md §4.3](../API.md)), keeps the C# names (`FullName`, `Guardians[0].Name`). `SystemTextJsonValidationMetadataProvider`
was tried and does not reach the parameters of a positional record, which is what every command is; rewriting that
response would mean replacing `InvalidModelStateResponseFactory`, too much for a shape that already carries no `code`
and English text, and that a client only shows as a form-level fallback.

## Consequences

- A client maps a key to a form path by replacing `[n]` with `.n`, with no case folding. The admin-frontend's
  `toFormErrors` matches flat keys (`name`, `color`) case-insensitively and keeps working unchanged; it does not
  rewrite `[n]` yet, because no form on `main` has list fields. That step belongs to the first form that does (the
  clients form), in its own frontend change.
- The OpenAPI schema does not change (`errors` is a string-keyed map), so the generated frontend types do not either.
- The conversion assumes the wire name of a field is the camelCase of its C# name. A `[JsonPropertyName]` on a
  command, or a different naming policy in the MVC JSON options, would break that silently; neither exists. Rename the
  C# property instead.
- Two keys can only collide after conversion if two properties of one command share a camelCase name, and
  System.Text.Json already refuses such a type ("The JSON property name … collides with another property"), so the
  request never reaches the validator. The conversion does not merge keys for a case that cannot occur.
