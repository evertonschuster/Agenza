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
) {}
```

Call `getAccessToken()` before each request and attach the header.
If `getAccessToken()` returns `null`, the session has expired — throw
an `UnauthenticatedError` rather than making a request without a token.

---

## Tenant scoping

The tenant is identified by the `tenant_id` claim inside the JWT
access token — the backend reads it from there. No extra header or
path parameter is needed. The bearer token already proves tenant identity.

This means:

- Repository methods still take `TenantContext` as first param (structural
  enforcement in application layer)
- But `AuthenticatedHttpClient` does NOT need to attach a separate
  tenant header — the JWT covers it

---

## Error shape

**To be confirmed when the backend is built.** Placeholder assumption:

```json
{
  "error": "string — machine-readable code",
  "message": "string — human-readable description",
  "details": {}
}
```

HTTP status codes:

- `400` — validation error (bad request body)
- `401` — unauthenticated (expired/missing token)
- `403` — forbidden (authenticated but not allowed)
- `404` — resource not found
- `409` — conflict (e.g. duplicate)
- `422` — unprocessable entity (business rule violation)
- `500` — server error

The `ApiError` class in `AuthenticatedHttpClient` should carry at least
`status: number` and `message: string`. Update this doc with the real
shape once the backend is live.

---

## Pagination

**To be confirmed with API spec for each resource.** Likely options:

- Cursor-based: `{ data: T[], nextCursor: string | null }`
- Offset-based: `{ data: T[], total: number, page: number, perPage: number }`

For v1, implement whatever the API returns. Don't build a pagination
abstraction before seeing the actual shape.

---

## Resource endpoints (fill in as each vertical is built)

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
