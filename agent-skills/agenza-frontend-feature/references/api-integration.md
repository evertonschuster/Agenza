# Frontend API integration

Read this reference only when changing a repository, mapper, decoder, generated
OpenAPI type, request body, endpoint path, or MSW API handler.

## Source of truth

1. Inspect the backend controller/response/command and the generated OpenAPI
   types already checked into the feature.
2. Run or inspect the API type generation workflow when the contract may have
   changed.
3. Use `docs/API.md` for integration policy and confirmed endpoint notes, not as
   a substitute for the generated contract.
4. Ask the user only if the remaining ambiguity would change a public contract
   or business rule.

Do not create a hand-written DTO that shadows an available generated type. A
feature-local decoder may narrow an `unknown` payload into that generated type.

## Boundary flow

- `HttpClient` receives a decoder and returns `Promise<Result<T, AppError>>`.
- A decoder may throw while rejecting malformed untrusted data; the global
  authenticated HTTP boundary catches that technical failure and returns a
  curated `Result.failure`. Repositories and presentation do not add another
  try/catch for expected failures.
- A mapper converts the decoded wire shape into domain values and composes any
  domain validation `Result`.
- Preserve absent/null distinctions only when the contract distinguishes them;
  normalize them before they enter the domain.

## Tenant and authentication

The mechanism is already decided: `AuthenticatedHttpClient` obtains one atomic
request-session snapshot, attaches `Authorization: Bearer ...` and
`X-Tenant-Id`, and the backend verifies the header against the token claim.
Repository methods neither accept `TenantContext` nor set the tenant header.

## Tests

- Mapper/decoder tests cover every field plus malformed and domain-invalid data.
- Repository tests use MSW and the real `HttpClient` path.
- Handlers match the exact URL, method, request, response, and relevant RFC 7807
  error shape. Register every handler; unhandled requests fail globally.
- Test at least the success path and each error behavior the repository maps or
  exposes differently.

