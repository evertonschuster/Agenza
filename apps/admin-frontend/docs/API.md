# Frontend API integration

This document owns stable frontend integration policy. Exact schemas come from
generated OpenAPI types and backend source; current feature progress comes from
`STATUS.md`.

## Configuration and request boundary

- `src/app/config/environment.ts` validates the six `VITE_*` values once before composition.
- `VITE_API_BASE_URL` is the services API base URL. The remaining keys configure the public OIDC authority, client, redirects, and required scopes.
- `AuthenticatedHttpClient` reads one atomic authenticated session snapshot and
  attaches `Authorization` plus `X-Tenant-Id`.
- The backend verifies the tenant header against the authenticated claim.
  Feature repositories never accept, select, or attach tenant identity.
- Session, HTTP, network, timeout, Problem Details, and decoder failures leave
  the HTTP boundary as `Result.failure(AppError)`.

## Contract source

The checked-in services-service contract is:

`src/features/catalog/infrastructure/generated/services-api.d.ts`

It is generated from the live OpenAPI document and checked for drift in CI.
Never edit it manually or maintain a handwritten DTO for the same wire shape.
Runtime decoders still validate external `unknown` payloads before mapping them
to domain values.

## Error contract

Backend failures use RFC 7807 Problem Details with a stable machine-readable
`code`; validation may include structured field errors. The HTTP boundary maps
these to `AppError`. Presentation uses feature-local code/field mappings and a
curated fallback, never raw backend or exception messages.

## Current use

The frontend currently consumes the Category collection and by-id operations.
The generated contract also contains backend resources not yet exposed by a
usable frontend vertical. Consult `STATUS.md` before adding UI or domain code.

## Contract change workflow

1. Change/verify the backend contract and tests.
2. Regenerate the checked-in TypeScript contract.
3. Update decoder/mapper/repository and MSW tests.
4. Run generated-contract drift and frontend gates.
5. Update this document only when stable policy or actual consumption changes.
