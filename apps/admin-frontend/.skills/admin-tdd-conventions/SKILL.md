---
name: admin-tdd-conventions
description: >
  Use this skill whenever writing or reviewing tests in the admin panel
  project. Covers the project's specific testing patterns, TypeScript
  strict-mode workarounds that appear repeatedly in tests, how to structure
  fake repositories vs MSW handlers vs component test wrappers, and known
  lint/compiler gotchas. Trigger on: writing any test file, debugging a
  test failure, setting up a new fake, or when TypeScript strict mode
  errors appear in test files. Do NOT skip this skill when testing — the
  project has several non-obvious constraints that are easy to get wrong.
---

# Admin TDD Conventions

## Which mock strategy for which layer

| Layer being tested          | Mock strategy                                                      |
| --------------------------- | ------------------------------------------------------------------ |
| Domain entities             | No mocks — pure functions/classes only                             |
| Application use cases       | Hand-written fake repositories (`createFakeXRepository`)           |
| Infrastructure repositories | MSW handlers — mock the HTTP boundary, not the repo                |
| Presentation hooks          | Fake container via `AppContainerContext.Provider`                  |
| Presentation components     | Fake container via `AppContainerContext.Provider` + `MemoryRouter` |

Never mix strategies. Don't use MSW to test use cases. Don't use fake
repos to test infrastructure repositories.

---

## Fake repository pattern

Always extract to a shared test helper after the second use case needs it:

```typescript
// src/application/test-helpers/createFakeServiceRepository.ts
import type { ServiceRepository } from '../repositories/ServiceRepository'

export function createFakeServiceRepository(
  overrides: Partial<ServiceRepository> = {},
): ServiceRepository {
  return {
    listAll: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
    create: () => Promise.reject(new Error('not implemented in this fake')),
    update: () => Promise.reject(new Error('not implemented in this fake')),
    delete: () => Promise.resolve(),
    ...overrides,
  }
}
```

Use `vi.fn()` for spying in specific tests:

```typescript
const listAllSpy = vi.fn(() => Promise.resolve([serviceFixture]))
const repo = createFakeServiceRepository({ listAll: listAllSpy })
```

---

## Fake container pattern (presentation tests)

```typescript
function buildFakeContainer(overrides: Partial<FakeUseCases> = {}): AppContainer {
  return {
    authRepository: {} as AppContainer['authRepository'],
    useCases: {
      getCurrentSession: { execute: vi.fn(() => Promise.resolve(null)) },
      // ... other use cases with safe defaults ...
      ...overrides,
    },
  } as unknown as AppContainer
}

// Always type the overrides with a local interface, not Partial<AppContainer['useCases']>
// because the latter demands full class instances, not plain { execute } objects.
interface FakeUseCases {
  getCurrentSession: { execute: () => Promise<TenantContext | null> }
  listServices: { execute: () => Promise<Service[]> }
  // etc.
}
```

---

## TypeScript strict mode gotchas in tests

### erasableSyntaxOnly — no constructor parameter shorthand

Applies to ALL classes, including test helpers and fakes:

```typescript
// WRONG — fails tsc even if vitest passes
class FakeThing {
  constructor(private readonly value: string) {}
}

// CORRECT
class FakeThing {
  private readonly value: string
  constructor(value: string) {
    this.value = value
  }
}
```

### exactOptionalPropertyTypes — conditional spread for optional fields

```typescript
// WRONG
Entity.create({ id: 'x', optionalField: maybeUndefined })

// CORRECT
Entity.create({
  id: 'x',
  ...(maybeUndefined !== undefined ? { optionalField: maybeUndefined } : {}),
})
```

### never-resolving Promise in tests

Testing "loading" or "in-flight" states requires a Promise that never
settles. The empty executor `() => {}` triggers `no-empty-function`.
Use an eslint-disable comment:

```typescript
// eslint-disable-next-line @typescript-eslint/no-empty-function
const neverResolves = vi.fn(() => new Promise<void>(() => {}))
```

### renderHook generic types

Always provide explicit generics to `renderHook` — without them,
`result.current` is untyped and triggers `no-unsafe-*` rules:

```typescript
import { type RenderHookResult, renderHook } from '@testing-library/react'
import { type UseServicesResult } from './useServices'

function renderUseServices(container: AppContainer): RenderHookResult<UseServicesResult, undefined> {
  return renderHook<UseServicesResult, undefined>(() => useServices(), {
    wrapper: /* ... */,
  })
}
```

### Wrapper return type

Always add an explicit return type on render/renderHook helper functions
to satisfy `explicit-function-return-type`. If the function doesn't use
the render return value, type it as `void`:

```typescript
function renderComponent(container: AppContainer): void {
  render(<MyComponent />, { wrapper: makeWrapper(container) })
}
```

---

## MSW handler conventions

```typescript
// src/test/mocks/handlers/serviceHandlers.ts
import { http, HttpResponse } from 'msw'

const BASE = 'http://localhost' // or use the env var value

export const serviceHandlers = [
  http.get(`${BASE}/api/v1/services`, () => {
    return HttpResponse.json([
      { id: 'svc-1', name: 'Haircut', duration_minutes: 30, price_cents: 2500 },
    ])
  }),

  http.post(`${BASE}/api/v1/services`, async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ id: 'svc-new', ...body }, { status: 201 })
  }),

  http.delete(`${BASE}/api/v1/services/:id`, () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
```

Register in `src/test/mocks/handlers/index.ts`:

```typescript
import { serviceHandlers } from './serviceHandlers'
export const handlers = [...serviceHandlers]
```

`onUnhandledRequest: 'error'` is globally configured — any unhandled
request fails loudly. This is intentional: it catches missing handlers
rather than silently hanging.

---

## waitFor and act conventions

- Use `await waitFor(() => { expect(...).toBe(...) })` with braces — not
  shorthand arrow returns (triggers `no-confusing-void-expression`)
- Use `await act(async () => { ... })` when triggering events that cause
  state updates
- For auth-wrapped components, always `await waitFor` for the initial
  session check to settle before asserting on the page's real state

---

## react-hooks/set-state-in-effect suppression

`useAsync`'s `void execute()` call inside a `useEffect` triggers this
rule as a false positive (the rule traces async call graphs and flags
setState calls that happen after awaits). The suppression is documented
and intentional:

```typescript
// eslint-disable-next-line react-hooks/set-state-in-effect
void execute()
```

Do not remove this comment. Do not add it to other places — if you see
this lint error elsewhere it's likely a real violation, not a false positive.

---

## Running targeted tests

```bash
# Single file
npx vitest run src/domain/entities/Service.test.ts

# Whole layer
npx vitest run src/application/

# All tests
npm run test

# Watch mode during TDD
npm run test:watch
```

Always run `npm run build` after `npm run test` — tsc catches type errors
that vitest/esbuild silently ignores. Both must pass before committing.
