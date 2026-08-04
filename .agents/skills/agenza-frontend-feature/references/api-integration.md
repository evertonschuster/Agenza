# Frontend API integration

Read only for repository, decoder, mapper, endpoint, generated OpenAPI, request
body, or MSW handler changes.

## Sources and boundary

1. Inspect the backend controller/command/response and checked-in generated
   OpenAPI types.
2. Use `docs/API.md` for stable policy, not as a schema copy.
3. Regenerate the contract when backend shape changed; never hand-edit the
   generated file or create a shadow DTO.
4. Decode external payloads from `unknown`, then map them to domain values.

`AuthenticatedHttpClient` reads one atomic request-session snapshot, attaches
the bearer token and `X-Tenant-Id`, and converts missing session, HTTP, network,
timeout, and decoder failures to `Result.failure(AppError)`. Repositories never
receive tenant context, attach tenant headers, or add a second expected-error
try/catch layer.

## Tests

- Decoder/mapper: valid payload, malformed payload, and domain-invalid payload.
- Repository: MSW through the real HTTP client path.
- Handlers: exact method, URL, request body, response, and relevant RFC 7807
  variants.
- Every request is registered; global unhandled-request failure remains on.
