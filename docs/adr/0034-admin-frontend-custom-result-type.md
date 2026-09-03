# ADR 0034 — admin-frontend uses a hand-written `Result` type, not neverthrow or Effect

Status: accepted (2026-09)

## Context

The admin-frontend represents expected failures as values rather than thrown
exceptions, the same contract the backend settled on in ADR 0005 and ADR 0014
(`Result` / `DomainResult`, no exceptions for expected outcomes). The frontend
question is whether to take that `Result` type from a library — neverthrow,
Effect, `fp-ts` `Either` — or write it.

## Decision

`shared/result.ts` defines it directly:

```ts
type Result<T, E> = { readonly ok: true; readonly data: T } | { readonly ok: false; readonly error: E };
const ok = <T>(data: T): Result<T, never> => ({ ok: true, data });
const fail = <E>(error: E): Result<never, E> => ({ ok: false, error });
```

Roughly six lines, zero dependencies. There is deliberately **no**
`unwrap()`-that-throws on the type. The single place a `Result` becomes an
exception is the framework boundary: `shared/api/unwrap.ts`'s `unwrapOrThrow`,
used only in route `loader`s (and, later, a query library's `queryFn`), where
React Router signals failure by a rejected promise. Its `ApiProblemError`
carries the `ApiProblem` so a route `errorElement` can render `title` and
`code`. Actions and mutations do **not** convert: a 400 with a per-field
`errors` map is expected flow and goes back to the form as a value via
`useActionData`.

**Why not a library:**

- neverthrow's value is its `map` / `andThen` / `mapErr` chaining. This
  codebase's stated preference — backend ADR 0005/0014, "explicit sequential
  `if (x.IsFailure) return`, no monadic `Bind`" — is exactly to not chain.
  The part we would import is the part we would not use.
- Effect is a runtime and an ecosystem; pulling it in for a two-variant union
  is disproportionate.
- A new runtime dependency here would have to justify itself against the
  deliberately short dependency list (`openapi-fetch`, `radix-ui`, `cva`,
  `clsx`, `tailwind-merge`). Six lines do not.

## Consequences

- Every consumer branches on `result.ok`, then on `result.error.code` /
  `.status`, and reads `result.error.errors` directly — nothing to import,
  nothing to learn.
- The `Result` → exception conversion has one implementation and surfaces
  only at route `loader`s: `grep -rn "unwrapOrThrow" src/` outside
  `shared/api/unwrap` matches nothing but `ui/pages/<Page>/route.ts` files —
  never a repository, a component, or an `action`.
- If a real need for combinators appears (long chains of dependent fallible
  steps), that is the trigger to reconsider a library — not to grow
  `result.ts` into one.
