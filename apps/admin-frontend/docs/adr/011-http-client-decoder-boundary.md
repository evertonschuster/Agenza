# ADR 011 — `HttpClient` takes a decoder instead of a caller-chosen generic

**Status:** Accepted

## Decision

`HttpClient.get`/`post`/`put` now require a `decode: (payload: unknown) => T`
argument alongside their generic `<T>`:

```typescript
export type Decoder<T> = (payload: unknown) => T

export interface HttpClient {
  get<T>(path: string, decode: Decoder<T>): Promise<T>
  post<T>(path: string, body: unknown, decode: Decoder<T>): Promise<T>
  put<T>(path: string, body: unknown, decode: Decoder<T>): Promise<T>
  delete(path: string): Promise<void>
}
```

`AuthenticatedHttpClient` no longer casts a parsed response body with
`as T` and no longer returns `undefined as T` for a 204 - it calls
`decode(rawBody)` (or `decode(undefined)` for 204) inside the same `try`
block that already converts every other failure to `AppError`
(`mapErrorToAppError`, docs/adr/007), so a decoder that throws is curated
exactly like a network or ProblemDetails failure.

Each repository now owns a small hand-rolled type-guard decoder next to
its DTO type (`tagMapper.ts`'s `decodeTagDto`/`decodeTagDtoArray`,
`categoryMapper.ts`'s equivalents, `serviceMapper.ts`'s `decodeServiceDto`/
`decodePagedServiceDto`) - the same style already established by
`shared/infrastructure/http/ProblemDetails.ts`'s `parseProblemDetails`,
not a new validation library. `PagedServiceDto`'s pagination metadata
(`totalCount`/`page`/`pageSize`) is coerced and checked for real
finiteness in the decoder itself, since - unlike `Service`'s own fields -
it has no domain entity of its own to validate it.

## Rationale

### The gap this closes

`get<T>(path)`/`post<T>(path, body)` let a caller pick any `T` it liked;
the implementation cast `response.json()`'s result to that `T` with zero
runtime check. A malformed or schema-drifted payload didn't fail loudly -
it silently became "trusted" data, and the first place it would actually
fail was wherever a mapper first called a method the wrong runtime shape
didn't support (e.g. `undefined.trim()` for a missing `name`), an
unhandled `TypeError` with no relation to the real cause.

### Why a decoder parameter (not `HttpClient` returning `unknown`)

Two options were considered:

- **A: `HttpClient` returns `unknown`**, each repository decodes inline
  after the call.
- **B: `HttpClient` takes a decoder**, decoding happens inside the same
  `try`/`catch` that already owns every other infrastructure-to-AppError
  conversion.

B was chosen because this codebase already has exactly one place that
converts infrastructure failures to `AppError` (`AuthenticatedHttpClient`'s
`catch (error) { throw mapErrorToAppError(error) }`, docs/adr/007). Option
A would need a second `try`/`catch` (or an equivalent wrapper) in every
repository method to keep a decode failure from becoming an unhandled
rejection - duplicating a pattern that already exists once. Option B
reuses it for free: a thrown decode error is just another `error` value
`mapErrorToAppError` doesn't recognize, so it falls through to the same
curated, retryable `'unexpected'` `AppError` every other unrecognized
failure already gets.

### Why hand-rolled type guards, not a schema library

Zod is already a dependency (React Hook Form validation), but
`shared/infrastructure/http/ProblemDetails.ts` already solves the same
problem - decode an untrusted JSON body into a typed shape - with plain
`typeof`/`Array.isArray` guards, no library. Introducing a second
validation approach into the same architectural layer (`shared/
infrastructure/http/` and its DTO counterparts) for no functional gain
would be inconsistent for a future reader. The generated OpenAPI types
(`components['schemas'][...]`) remain the compile-time contract, unchanged
by this ADR - the decoders are the runtime counterpart every DTO already
implicitly needed.

### Why `Service`'s own numeric fields stay loosely checked here

`serviceMapper.ts`'s decoder accepts `number | string` for `durationMinutes`
and friends - the same widened shape the generated `ServiceResponse`
actually declares - rather than asserting they're finite numbers itself.
`Service.create()` already does that with curated, per-field pt-BR
messages (docs/adr/010); duplicating a coarser version of the same check
in the decoder would produce a worse, generic error for exactly the cases
docs/adr/010 already handles well. The decoder's job here is narrower:
rule out a value that isn't plausibly numeric at all (an object, a
boolean), not perform the final validation.

## Consequences

- Every `ApiTagRepository`/`ApiCategoryRepository`/`ApiServiceRepository`
  call site now passes a decoder; `AuthenticatedHttpClient.test.ts` and
  the three mapper test files gained coverage for a missing property, a
  wrong-typed property, a non-object payload, and (for the paged
  envelope) invalid/missing pagination metadata.
- `204` no longer relies on `undefined as T` - `decode(undefined)` is
  type-checked like any other call, and `delete()` still returns a plain
  `Promise<void>` unaffected by this change.
- Any future REST resource added to this codebase must supply its own
  decoder the same way; there is no default "trust the generic" fallback
  anymore.
- This ADR does not change the wire contract or backend behavior - only
  how the frontend treats a response it has already received.
