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

The access token comes from `oidc-client-ts` via `OidcAuthRepository`.
In `AuthenticatedHttpClient`, wire it like this:

```typescript
constructor(
  private readonly baseUrl: string,
  private readonly getAccessToken: () => Promise<string | null>,
  private readonly getTenantId: () => Promise<string | null>,
) {}
```

Call `getAccessToken()` before each request and attach the header.
If `getAccessToken()` returns `null`, the session has expired — throw
an `UnauthenticatedError` rather than making a request without a token.

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
- `AuthenticatedHttpClient` attaches `X-Tenant-Id` whenever a tenant is
  known (omitted only for pre-session calls, e.g. before login) —
  individual repositories never set this header themselves

---

## Error shape

**Confirmed** (services-service, ASP.NET Core): errors are RFC 7807
Problem Details:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Tag name is already in use.",
  "status": 409,
  "detail": "A tag named 'VIP' already exists."
}
```

HTTP status codes:

- `400` — validation error (bad request body)
- `401` — unauthenticated (expired/missing token)
- `403` — forbidden (authenticated but not allowed)
- `404` — resource not found
- `409` — conflict (e.g. duplicate)
- `500` — server error

The `ApiError` class in `AuthenticatedHttpClient` carries
`status: number` and `message: string` — populate `message` from
`title` (fall back to `detail`, then to the raw body).

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

### Services

> Spec not yet received. Do not implement until provided by project owner.

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
