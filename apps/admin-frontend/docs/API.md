# API Integration Guide

How this admin panel talks to the backend REST API. Read this before
building any infrastructure repository.

---

## Base URL

```
VITE_API_BASE_URL=https://api.example.com
```

Set in `.env.local`. The `AuthenticatedHttpClient` prepends this to
every request path. Never hardcode URLs in repository files.

---

## Authentication

Every request to the backend API requires:

```
Authorization: Bearer <access_token>
```

The access token comes from `oidc-client-ts` via `OidcAuthRepository`
(`features/auth/infrastructure/`). `AuthenticatedHttpClient`
(`shared/infrastructure/http/`) reads the token and tenant id together,
from a single `GetRequestSession` call per request
(`shared/application/RequestSession.ts`) — never two independent reads,
so they can't end up from different moments of a session transition:

```typescript
export interface RequestSession {
  readonly accessToken: string
  readonly tenantId: string | null
}
export type GetRequestSession = () => Promise<RequestSession | null>
```

If `getRequestSession()` returns `null`, the session has expired — throw
an `UnauthenticatedError` rather than making a request without one.

---

## Tenant scoping

The client sends the tenant id explicitly in the `X-Tenant-Id` header on
every request (`AuthenticatedHttpClient` attaches it automatically from
the current session's `user.tenant.id`) — the backend verifies it
against the `tenant_id` claim inside the JWT access token and rejects
the request with `403` on any mismatch or if the header is missing
(docs/adr/0006 in the backend repo). The bearer token alone is no longer
sufficient; the header is required by default for every tenant-scoped
endpoint.

This means:

- Repository methods still take `TenantContext` as first param (structural
  enforcement in application layer)
- `AuthenticatedHttpClient` attaches `X-Tenant-Id` whenever the same
  per-request session read returned a tenant id (omitted only for
  pre-session calls, e.g. before login) — individual repositories never
  set this header themselves

---

## Error shape

**Confirmed** (services-service, ASP.NET Core): errors are RFC 7807
Problem Details, always carrying a machine-readable `code`
(docs/adr/0012) — a plain conflict/not-found/forbidden/business error:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Já existe uma etiqueta chamada 'VIP'.",
  "status": 409,
  "code": "Tag.DuplicateName"
}
```

A validation error (400) additionally carries a per-field `errors` map,
keyed by the backend's PascalCase property name, each entry an array of
`{code, message}`:

```json
{
  "type": "https://agenza/errors/validation",
  "title": "Ocorreram erros de validação.",
  "status": 400,
  "code": "Validation.Failed",
  "errors": {
    "Name": [
      { "code": "Service.NameTooLong", "message": "O nome deve possuir no máximo 80 caracteres." }
    ]
  }
}
```

HTTP status codes:

- `400` — validation error (bad request body)
- `401` — unauthenticated (expired/missing token)
- `403` — forbidden (authenticated but not allowed)
- `404` — resource not found
- `409` — conflict (e.g. duplicate)
- `500` — server error

`shared/infrastructure/http/ProblemDetails.ts` defines the typed contract
(`ProblemDetails`, `FieldError`) and `parseProblemDetails`, a safe runtime
parser (no `any`, no sniffing error kind from message text). Infrastructure
first builds an `ApiError` (`status`, `message` from `title` falling back
to `detail`, `details: ProblemDetails | undefined`) and immediately
converts it to an `AppError` (`shared/application/AppError.ts`) before it
leaves `AuthenticatedHttpClient` — `ApiError`/`ProblemDetails` never cross
into application or presentation (docs/adr/007).
`shared/presentation/forms/serverFormError.ts`'s `mapApiErrorToForm` turns
a caught `AppError` into field-level messages a form applies via
react-hook-form's `setError`, reading `AppError.rawFieldErrors`/
`backendCode` — each form (`ServiceForm`/`CategoryForm`/`TagForm`) exports
its own backend-property → field-name map (e.g. `DurationMinutes` →
`durationMinutes`) and a conflict-`code` → field map (e.g.
`Service.DuplicateName` → `name`).

---

## Pagination

**To be confirmed with API spec for each resource.** Likely options:

- Cursor-based: `{ data: T[], nextCursor: string | null }`
- Offset-based: `{ data: T[], total: number, page: number, perPage: number }`

For v1, implement whatever the API returns. Don't build a pagination
abstraction before seeing the actual shape.

---

## Resource endpoints (fill in as each vertical is built)

### Tags

Served by **services-service** (`VITE_API_BASE_URL`). Tenant scope comes
from the `X-Tenant-Id` header, verified against the JWT's `tenant_id`
claim. Routes are versioned (`Asp.Versioning.Mvc`, docs/adr/0005) —
omitting the segment falls back to v1, but the frontend always sends it
explicitly.

| Method   | Path                | Success                                     |
| -------- | ------------------- | ------------------------------------------- |
| `GET`    | `/api/v1/tags`      | `200` — `TagDto[]`, ordered by name (asc)   |
| `POST`   | `/api/v1/tags`      | `201` — created `TagDto`, `Location` header |
| `PUT`    | `/api/v1/tags/{id}` | `200` — updated `TagDto`                    |
| `DELETE` | `/api/v1/tags/{id}` | `204` — no body                             |

`GET` accepts an optional `search` query param (case-insensitive name
match), e.g. `GET /api/v1/tags?search=vip`.

`DELETE` fails with `400` (`Tag.InUse`) if the tag is still referenced by
one or more Services.

`TagDto`:

```json
{
  "id": "0b6e5b3c-8f4e-4a52-9d0e-1c2a3b4c5d6e",
  "name": "VIP",
  "color": "#0d9488",
  "description": "High-value returning client"
}
```

`description` is `null` when unset. Request body for `POST`/`PUT` is the
same shape minus `id` (`description` optional).

Validation rules (server-enforced, mirror them client-side):

- `name`: required, trimmed, 1–40 chars, **unique per tenant**
  (case-insensitive) → violations: `400` (shape) / `409` (duplicate)
- `color`: required, must be one of the fixed palette below → `400`
- `description`: optional, trimmed, max 200 chars → `400`
- Unknown `{id}` within the tenant → `404`

Fixed color palette (the only accepted `color` values):

```
#0d9488 (teal)   #0ea5e9 (sky)    #8b5cf6 (violet) #ec4899 (pink)
#ef4444 (red)    #f59e0b (amber)  #22c55e (green)  #64748b (slate)
```

### Categories

Served by **services-service** (`VITE_API_BASE_URL`). Tenant scope comes
from the `X-Tenant-Id` header, verified against the JWT's `tenant_id`
claim. Routes are versioned (`Asp.Versioning.Mvc`, docs/adr/0005) —
omitting the segment falls back to v1, but the frontend always sends it
explicitly.

| Method   | Path                      | Success                       |
| -------- | ------------------------- | ----------------------------- |
| `GET`    | `/api/v1/categories`      | `200` — `CategoryDto[]`       |
| `POST`   | `/api/v1/categories`      | `201` — created `CategoryDto` |
| `PUT`    | `/api/v1/categories/{id}` | `200` — updated `CategoryDto` |
| `DELETE` | `/api/v1/categories/{id}` | `204` — no body               |

`GET` accepts an optional `search` query param (case-insensitive name
match), e.g. `GET /api/v1/categories?search=massa`.

`DELETE` fails with `400` (`Category.InUse`) if the category is still
referenced by one or more Services.

`CategoryDto`:

```json
{
  "id": "3f2b6a10-9c3e-4a1e-8b0a-2a1c3d4e5f60",
  "name": "Massagens"
}
```

Request body for `POST`/`PUT` is the same shape minus `id`: `{ "name": "Massagens" }`.

Validation rules (server-enforced, mirror them client-side):

- `name`: required, trimmed, non-empty → `400`
- Unknown `{id}` within the tenant → `404`

### Services

Served by **services-service** (`VITE_API_BASE_URL`). Tenant scope comes
from the `X-Tenant-Id` header, verified against the JWT's `tenant_id`
claim. Routes are versioned (`Asp.Versioning.Mvc`, docs/adr/0005) —
omitting the segment falls back to v1, but the frontend always sends it
explicitly.

| Method   | Path                    | Success                           |
| -------- | ----------------------- | --------------------------------- |
| `GET`    | `/api/v1/services`      | `200` — `PagedResult<ServiceDto>` |
| `POST`   | `/api/v1/services`      | `201` — created `ServiceDto`      |
| `PUT`    | `/api/v1/services/{id}` | `200` — updated `ServiceDto`      |
| `DELETE` | `/api/v1/services/{id}` | `204` — no body                   |

`GET` accepts `page` (1-based, default `1`) and `pageSize` (default `20`,
max `100`) query params, e.g. `GET /api/v1/services?page=2&pageSize=20`.
It also accepts optional `search` (case-insensitive name match),
`categoryId`, and `tagId` filters, e.g.
`GET /api/v1/services?search=corte&categoryId={id}&tagId={id}`.
Response envelope (`PagedResult<ServiceDto>`):

```json
{
  "items": [/* ServiceDto[] */],
  "totalCount": 45,
  "page": 2,
  "pageSize": 20
}
```

`TagSummaryDto` (embedded on a `ServiceDto`, a slice of the full Tag):

```json
{ "id": "0b6e5b3c-8f4e-4a52-9d0e-1c2a3b4c5d6e", "name": "VIP", "color": "#0d9488" }
```

`ServiceDto`:

```json
{
  "id": "7a1b2c3d-4e5f-4061-9a2b-3c4d5e6f7081",
  "code": 1001,
  "name": "Massagem relaxante",
  "description": "Uma massagem relaxante de corpo inteiro",
  "durationMinutes": 60,
  "minDurationMinutes": 30,
  "maxDurationMinutes": 90,
  "price": 150,
  "maxDiscountPercentage": 10,
  "categoryId": "3f2b6a10-9c3e-4a1e-8b0a-2a1c3d4e5f60",
  "categoryName": "Massagens",
  "tags": [{ "id": "0b6e5b3c-8f4e-4a52-9d0e-1c2a3b4c5d6e", "name": "VIP", "color": "#0d9488" }]
}
```

`description`, `categoryId`, and `categoryName` are `null` when unset.
`code` is server-assigned and immutable — never sent in a request body.

Request body for `POST`/`PUT` (`PUT` omits `code`, which never changes):

```json
{
  "name": "Massagem relaxante",
  "description": "Uma massagem relaxante de corpo inteiro",
  "durationMinutes": 60,
  "minDurationMinutes": 30,
  "maxDurationMinutes": 90,
  "price": 150,
  "maxDiscountPercentage": 10,
  "categoryId": "3f2b6a10-9c3e-4a1e-8b0a-2a1c3d4e5f60",
  "tagIds": ["0b6e5b3c-8f4e-4a52-9d0e-1c2a3b4c5d6e"]
}
```

`description` and `categoryId` are optional (`string | null`); `tagIds`
is optional (defaults to an empty list server-side if omitted).

Validation rules (server-enforced, mirror them client-side):

- `name`: required, trimmed, non-empty → `400`
- `1 <= minDurationMinutes <= durationMinutes <= maxDurationMinutes <= 1440` → `400`
- `0 <= maxDiscountPercentage <= 100` → `400`
- `price >= 0` → `400`
- `categoryId`, if set, must reference a Category owned by the same tenant → `400`
- `tagIds`, if set, must each reference a Tag owned by the same tenant → `400`
- Unknown `{id}` within the tenant → `404`

### Appointments

> Spec not yet received. Do not implement until provided by project owner.

### Clients

> Spec not yet received. Do not implement until provided by project owner.

### Conversations

> Spec not yet received. Do not implement until provided by project owner.

### Business Settings

> Spec not yet received. Do not implement until provided by project owner.

---

## How to add a new resource

1. Get the spec from the project owner (do not invent endpoint shapes)
2. Read `.skills/admin-api-contract/SKILL.md`
3. Define the DTO interface in the mapper file
4. Write mapper tests first
5. Write MSW handlers that match the real endpoint paths
6. Implement the repository
7. Update this doc with the confirmed endpoint shapes
