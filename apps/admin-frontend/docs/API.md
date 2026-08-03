# Frontend API integration

This document records stable integration policy and which backend contracts the
frontend currently consumes. Exact schemas come from generated OpenAPI types and
backend source; do not copy field inventories here.

## Request boundary

- `VITE_API_BASE_URL` supplies the base URL from local environment config.
- `AuthenticatedHttpClient` obtains one `GetRequestSession` snapshot per request
  and attaches `Authorization: Bearer <token>` plus `X-Tenant-Id`.
- The backend verifies the tenant header against the authenticated `tenant_id`
  claim. Feature repositories never accept, select, or attach tenant identity.
- A missing/invalid session, 401, network failure, timeout, non-success response,
  or decoder rejection leaves the HTTP boundary as `Result.failure(AppError)`.
  Repositories and presentation do not parse raw exceptions.

## Contract sources

For services-service, the checked-in generated contract is:

`src/features/catalog/infrastructure/generated/services-api.d.ts`

It is generated from the live OpenAPI document and verified in CI. Use the
generated schema for request/response types, the backend controller/command/
response for intent, and the canonical API-contract-review skill to detect
drift. Never edit the generated file or create a hand-written shadow DTO.

A feature-local decoder still validates `unknown` runtime payloads. Static
TypeScript types do not make external JSON trustworthy.

## Error contract

Backend failures use RFC 7807 Problem Details with a stable machine-readable
`code`. Validation errors may also expose structured per-field errors.
`AuthenticatedHttpClient` converts these into `AppError`; forms map structured
field/code values through their feature-local maps and use a curated global
fallback. User-facing code never parses a free-text backend message.

## Current consumption

| Backend resource                               | Frontend state                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------- |
| Categories                                     | Implemented in Catalog; collection and by-id operations consumed              |
| Services                                       | Backend contract generated; frontend route is currently a stub                |
| Tags                                           | Backend API retained; intentionally not modeled or surfaced in frontend       |
| Clients, Appointments, Conversations, Settings | No confirmed frontend vertical; inspect backend/OpenAPI before implementation |

`docs/STATUS.md` is the source for feature progress. The generated contract may
contain resources the current UI does not expose.

## Adding or changing integration

1. Inspect generated types, backend source, tests, and the ADR index before
   asking for missing information.
2. If the backend contract changed, update the backend first and regenerate; do
   not hand-edit generated TypeScript.
3. Add/update decoder and mapper tests for success, malformed data, and domain
   validation failures.
4. Add/update repository tests through MSW using the real HTTP boundary.
5. Update feature status only when usable behavior changed; update this document
   only when stable integration policy or consumption changed.
