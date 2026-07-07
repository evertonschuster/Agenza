---
name: admin-api-contract
description: >
  Use this skill whenever the user provides an API spec (endpoint paths,
  request/response shapes, field names, status codes) for a feature in the
  admin panel project. Covers: defining typed DTOs from the spec, building
  the infrastructure mapper (DTO → domain entity), writing MSW test
  handlers that match the real API's shape, and identifying mapping edge
  cases before writing any code. Trigger on phrases like "here's the API
  spec", "the endpoint is...", "the response looks like...", or when the
  user pastes JSON shapes or OpenAPI snippets. Do not guess at field names
  or response shapes — always derive them from what the user provides.
---

# Admin API Contract

This skill governs the translation from an external API spec into the
project's infrastructure layer. The goal is a single, well-tested seam
where "what the API sends" becomes "what the domain layer works with."

---

## Step 1: Parse the spec

When the user provides a spec, extract and confirm:

| Item                                | Where it goes                                                |
| ----------------------------------- | ------------------------------------------------------------ |
| Base path (e.g. `/api/v1/services`) | `AuthenticatedHttpClient` prefix + repository method paths   |
| HTTP method per operation           | Repository method implementation                             |
| Request body shape                  | `CreateXInput` / `UpdateXInput` interfaces in the repository |
| Response body shape                 | DTO interface in `src/infrastructure/mappers/`               |
| Error codes and shapes              | `ApiError` handling in the repository                        |
| Tenant scoping mechanism            | HTTP header? Path param? Query param? Confirm with user      |

If anything is ambiguous or missing, ask before writing code.

---

## Step 2: Define the DTO interface

Location: alongside the mapper, e.g.
`src/infrastructure/mappers/serviceMapper.ts`

Rules:

- DTO fields must exactly match the API's JSON keys (snake_case if the API uses it)
- All fields optional-or-required must match what the API actually sends
- Use `unknown` for fields whose type you're not certain of — never `any`
- If a field could be null OR absent, use `field?: string | null`

Example:

```typescript
// Exactly mirrors what the API sends — no transformation yet
interface ServiceDto {
  id: string
  tenant_id: string
  name: string
  duration_minutes: number
  price_cents: number
  description?: string | null
  is_active: boolean
  created_at: string // ISO 8601
}
```

---

## Step 3: Write the mapper (TDD first)

The mapper is a pure function. Write the test before the implementation.

Test checklist:

- [ ] Maps every field correctly (including unit conversions, e.g. cents → Money)
- [ ] Handles optional/nullable fields correctly (absent vs null vs present)
- [ ] Throws a named error when a required field is missing or invalid
- [ ] Converts date strings to `Date` objects where appropriate

Watch for `exactOptionalPropertyTypes` — when passing optional fields into
`Entity.create()`, use conditional spread:

```typescript
const entity = Entity.create({
  id: dto.id,
  ...(dto.description != null ? { description: dto.description } : {}),
})
```

Watch for `noUncheckedIndexedAccess` — when reading from the DTO object
via index (e.g. `dto['tenant_id']`), the type is `unknown`. Add a
`typeof x === 'string'` guard before use.

---

## Step 4: Write MSW handlers

Location: `src/test/mocks/handlers/featureHandlers.ts`

Rules:

- Use `http.get`, `http.post`, `http.put`, `http.delete` from `msw`
- Match the exact path the repository will call (including base URL if relevant)
- Return realistic DTO shapes that match the DTO interface exactly
- Include at least one error handler variant (e.g. 404, 422) per endpoint
  to test the repository's error handling

Register in `src/test/mocks/handlers/index.ts`:

```typescript
import { featureHandlers } from './featureHandlers'
export const handlers: RequestHandler[] = [...featureHandlers]
```

Remember: `onUnhandledRequest: 'error'` is configured globally — any
repository call without a registered handler will fail tests loudly.

---

## Step 5: Confirm tenant scoping mechanism

Before writing the repository, confirm HOW the API expects the tenant to
be identified. Common patterns:

| Pattern                                            | How to implement                                 |
| -------------------------------------------------- | ------------------------------------------------ |
| JWT claim (most likely — IdentityServer issues it) | Already in the Bearer token, no extra work       |
| `X-Tenant-Id` header                               | Add to `AuthenticatedHttpClient` default headers |
| Path prefix `/api/tenants/{id}/services`           | Include in repository path construction          |
| Query param `?tenant_id=...`                       | Append in repository method                      |

If the JWT claim covers it (most likely given this project's IdentityServer
setup), no extra work is needed — the token already proves tenant identity.

---

## Step 6: Common field translation patterns

| API type            | Domain type                     | Notes                                   |
| ------------------- | ------------------------------- | --------------------------------------- |
| `string` (ISO 8601) | `Date`                          | `new Date(dto.created_at)`              |
| `number` (cents)    | `Money` value object            | `Money.fromCents(dto.price_cents)`      |
| `number` (minutes)  | plain `number`                  | keep as-is unless duration needs a VO   |
| `string` (enum)     | TypeScript union or enum        | validate against known values in mapper |
| `null \| string`    | `string \| undefined` on domain | strip nulls at the mapper boundary      |

The domain layer should never see `null` — convert API nulls to `undefined`
or omit the field entirely in `Entity.create()`.
