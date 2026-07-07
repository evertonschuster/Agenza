---
name: admin-feature-vertical
description: >
  Use this skill whenever building a new feature vertical in the admin
  panel project (Services, Appointments, Clients, Inbox, Dashboard,
  Settings). A "feature vertical" means a full slice from domain entity
  through use cases, infrastructure repository, presentation hook, and
  page component. Trigger this skill any time the user says "let's build
  [feature]", "implement [feature]", "next feature", or provides an API
  spec for a resource. Do NOT proceed without reading this skill first —
  it encodes project-specific conventions that differ from generic Clean
  Architecture tutorials.
---

# Admin Feature Vertical

A feature vertical in this project is a full slice:

```
domain/entities/          → plain TS class, no framework deps
application/repositories/ → interface (port)
application/use-cases/    → one class per use case, constructor-injected repo
infrastructure/repositories/ → implements the port via HttpClient
infrastructure/mappers/   → DTO → domain entity mapping function
presentation/hooks/       → useFeature built on useAsync
presentation/pages/       → replaces the stub page
```

---

## Pre-conditions before writing any code

1. **Get the API spec** from the user before touching infrastructure.
   Ask for: endpoint paths, HTTP methods, request shape, response shape,
   error codes. Never invent field names.

2. **Check whether HttpClient exists** at
   `src/infrastructure/http/HttpClient.ts`. If not, build it first
   (see the HttpClient section below) — every REST repository depends on it.

3. **Identify which use cases are needed** for the first version of this
   page. Don't build every possible use case upfront — only what the
   current page actually renders.

---

## Step-by-step build order

### 1. Domain entity (TDD)

Location: `src/domain/entities/FeatureName.ts`

Rules:

- Zero imports from React, application/, infrastructure/, or presentation/
- Private constructor + static `create(input)` factory
- Validates invariants in `create()` and throws a named `DomainError` subclass
- NO constructor parameter property shorthand — `erasableSyntaxOnly` forbids it.
  Always use explicit field declarations + assignment in the constructor body.
- Optional fields: use `if (value !== undefined) { this.field = value }`
  pattern, NOT direct assignment — `exactOptionalPropertyTypes` requires it.

Write test first. Test file alongside the entity.

### 2. Repository interface (no test needed)

Location: `src/application/repositories/FeatureRepository.ts`

Rules:

- Interface only, no implementation
- All methods take `tenantContext: TenantContext` as first parameter
- Return domain entities, never raw DTOs
- `Promise<T | null>` for nullable results

### 3. Use cases (TDD)

Location: `src/application/use-cases/feature/UseCaseName.ts`

Rules:

- One class per use case
- NO constructor parameter property shorthand:

```typescript
export class ListServices {
  private readonly serviceRepository: ServiceRepository

  constructor(serviceRepository: ServiceRepository) {
    this.serviceRepository = serviceRepository
  }
}
```

- Test with hand-written fake repositories (see admin-tdd-conventions skill)
- Add shared fake to `src/application/test-helpers/createFakeFeatureRepository.ts`

### 4. Wire into the container

Add to `AppContainer` interface and `createAppContainer()` in
`src/composition/container.ts`.

### 5. Infrastructure mapper (TDD)

Location: `src/infrastructure/mappers/featureMapper.ts`

- Pure function: `mapApiDtoToDomainEntity(dto: FeatureDto): Feature`
- Test every field mapping and every validation failure path

### 6. Infrastructure repository (TDD with MSW)

Location: `src/infrastructure/repositories/ApiFeatureRepository.ts`

- Implements the repository interface
- Takes `HttpClient` in constructor (explicit field pattern)
- Tests use MSW handlers in `src/test/mocks/handlers/featureHandlers.ts`
- Register handlers in `src/test/mocks/handlers/index.ts`

### 7. Presentation hook (TDD)

Built on `useAsync`. Get `tenantContext` from `useAuth()` inside a ProtectedRoute —
always non-null at this point.

### 8. Page component

Replace the stub. Design language:

- Background: `bg-slate-50`
- Cards: `bg-white border border-slate-200 rounded-xl`
- Primary buttons: `bg-teal-600 hover:bg-teal-700 text-white`
- Headings: `text-slate-800 font-semibold`
- Body: `text-slate-600` / Muted: `text-slate-400`
- Accent: `text-teal-700 border-teal-600`

Handle all three `useAsync` states: loading → skeleton, error → message + retry,
success → real UI.

---

## HttpClient (build before the first REST feature if missing)

```typescript
// src/infrastructure/http/HttpClient.ts
export interface HttpClient {
  get<T>(path: string): Promise<T>
  post<T>(path: string, body: unknown): Promise<T>
  put<T>(path: string, body: unknown): Promise<T>
  delete(path: string): Promise<void>
}
```

Implementation `AuthenticatedHttpClient`:

- Constructor takes `getAccessToken: () => Promise<string | null>`
- Prepends `VITE_API_BASE_URL` env var
- Attaches `Authorization: Bearer <token>`
- Throws typed `ApiError` (with `status`, `message`) on non-2xx
- Wire into `createAppContainer()` using `authRepository` to supply the token

---

## Commit checklist

- [ ] Domain entity: explicit field declarations, named errors, no framework deps
- [ ] Repository interface: `TenantContext` first param on all methods
- [ ] Use cases: explicit constructor body (no shorthand), tested with fakes
- [ ] Container: wired in interface and factory
- [ ] Mapper: tested, all fields and failure paths covered
- [ ] Infrastructure repo: tested with MSW, handler registered
- [ ] Hook: built on `useAsync`, tested with fake container
- [ ] Page: handles loading/error/success, follows design language
- [ ] `npm run build` clean (catches TypeScript strict mode issues)
- [ ] `npm run lint` clean
- [ ] `npm run test` all green
