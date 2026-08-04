# ADR 011 — HttpClient requires a runtime decoder

**Status:** Accepted; Result-returning signatures are finalized by ADR 014.

## Decision

Every successful-response HTTP method receives a decoder:

```typescript
export type Decoder<T> = (payload: unknown) => T

interface HttpClient {
  get<T>(path: string, decode: Decoder<T>): Promise<Result<T, AppError>>
  post<T>(path: string, body: unknown, decode: Decoder<T>): Promise<Result<T, AppError>>
  put<T>(path: string, body: unknown, decode: Decoder<T>): Promise<Result<T, AppError>>
}
```

- `fetch`/JSON output is `unknown` until decoded.
- A decoder may throw to reject malformed external data; the authenticated HTTP
  boundary catches that technical failure once and returns a curated
  `Result.failure(AppError)`.
- Repositories receive decoded wire values, map them to domain values, and do
  not add another expected-error try/catch layer.
- Generated OpenAPI types may be reused by decoders but never replace runtime
  validation.

## Consequences

Callers cannot opt into an unchecked generic cast. Malformed backend payloads
fail at one infrastructure boundary and presentation sees only `AppError`.
