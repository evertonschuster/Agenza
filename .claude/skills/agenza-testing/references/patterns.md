# Worked test patterns

Each pattern shows the smallest shape that matters and names the live file to copy from. Read the
live file — it is the truth; these are silhouettes.

---

## 1. A pure function — zero mocks

Live: [`sessionMachine.test.ts`](../../../../apps/admin-frontend/src/shared/session/sessionMachine.test.ts)

The whole test is a fixture in and an assertion out. If you reach for `vi.mock` here, the module
under test has a dependency it should not have.

```ts
import { describe, expect, it } from 'vitest';
import { makePrincipal } from '@/test/oidcUser';
import { reduceSession } from './sessionMachine';

describe('reduceSession', () => {
  it('USER_LOADED with a token missing tenant_id -> unauthenticated (spec FR-009)', () => {
    const result = reduceSession({ type: 'USER_LOADED', principal: makePrincipal() });

    expect(result.session.status).toBe('unauthenticated');
    expect(result.session.failureReason).toBe('missing_tenant_claim');
  });
});
```

Exhaustive branch sets use `it.each` with an `as const` tuple array so the case list stays readable
and TypeScript keeps the literal types.

Fixture builders live in [`src/test/oidcUser.ts`](../../../../apps/admin-frontend/src/test/oidcUser.ts)
(`makePrincipal`, `makeOidcUser`, `makeAccessToken`). Add to that file rather than hand-rolling a
principal in a test; a token built by hand tends to be missing exactly the claim under test.

---

## 2. A module-singleton store

Live: [`sessionStore.test.ts`](../../../../apps/admin-frontend/src/shared/session/sessionStore.test.ts)

The store is module state: it survives between tests in the same file. `reset()` in `beforeEach` is
not optional, and it is also what forces the store to expose one.

```ts
beforeEach(() => {
  vi.clearAllMocks();
  sessionStore.reset();
});
```

Three things worth testing and nothing else: that a dispatch replaces the snapshot and notifies every
subscriber, that unsubscribe actually stops notifications, and that the derived reader
(`getAuthCredentials`) agrees with the snapshot.

Timestamps go through fake timers so the assertion is exact rather than approximate:

```ts
vi.useFakeTimers({ now: Date.parse('2026-09-03T12:00:00.000Z') });
```

Pair it with `vi.useRealTimers()` in `afterEach`.

**`themeStore` gotcha:** jsdom does not implement `window.matchMedia`. A store that reads the OS
preference throws on import unless you define a stub before the module is imported — define it in the
test file's own setup, not in `src/vitest-setup.ts`, so only the tests that need it carry it.

---

## 3. A hook over a provider, with a mocked module

Live: [`AuthProvider.test.tsx`](../../../../apps/admin-frontend/src/features/auth/ui/AuthProvider.test.tsx)

The pattern that makes an event-emitter integration testable: capture the handlers the module under
test registers, then fire them yourself inside `act()`.

```tsx
const { mockGetUser, handlers } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  handlers: { userLoaded: undefined as Handler<User> | undefined },
}));

vi.mock('../api/authClient', () => ({
  authClient: {
    getUser: mockGetUser,
    events: {
      addUserLoaded: (fn: Handler<User>) => {
        handlers.userLoaded = fn;
      },
      removeUserLoaded: vi.fn(),
    },
  },
}));

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

const { result } = renderHook(() => useAuth(), { wrapper });
await waitFor(() => expect(result.current.session.status).toBe('unauthenticated'));

act(() => {
  handlers.userLoaded?.(makeOidcUser({ tenantId: TENANT_A }));
});
```

Reset the captured handlers in `beforeEach` alongside `sessionStore.reset()` — a stale handler from
the previous test dispatches into the store you just reset.

**Races are testable, and this is where they belong.** Hold a promise open (`mockSignoutRedirect`
returning a promise you resolve by hand), fire the competing event mid-flight, and assert the state
did *not* move. The logout-vs-renewal races in the live file are the model.

---

## 4. A page: assert the consequence, under StrictMode

Live: [`LoginPage.test.tsx`](../../../../apps/admin-frontend/src/features/auth/ui/pages/LoginPage/LoginPage.test.tsx)
and [`AuthCallbackPage.test.tsx`](../../../../apps/admin-frontend/src/features/auth/ui/pages/AuthCallbackPage/AuthCallbackPage.test.tsx)

The shell has no logic, so there is nothing to assert about it directly. Render it with a hand-built
context value and check what the hook did.

```tsx
render(
  <StrictMode>
    <AuthContext.Provider value={value}>
      <LoginPage />
    </AuthContext.Provider>
  </StrictMode>,
);

expect(login).toHaveBeenCalledTimes(1);
```

`<StrictMode>` is load-bearing: without it a missing mount guard passes. Where a page navigates,
assert the destination rendered rather than spying on the router.

---

## 5. A component whose behaviour is routing

Live: [`ProtectedRoute.test.tsx`](../../../../apps/admin-frontend/src/features/auth/ui/ProtectedRoute.test.tsx)

Give every destination a marker element and assert which one is on screen. Nothing is spied on, so
the test survives a router upgrade.

```tsx
render(
  <MemoryRouter initialEntries={['/']}>
    <AuthContext.Provider value={value}>
      <Routes>
        <Route path="/login" element={<div>Login Screen</div>} />
        <Route path="/" element={<ProtectedRoute><div>Protected Shell</div></ProtectedRoute>} />
      </Routes>
    </AuthContext.Provider>
  </MemoryRouter>,
);

expect(screen.getByText('Login Screen')).toBeInTheDocument();
expect(screen.queryByText('Protected Shell')).not.toBeInTheDocument();
```

Assert both the presence *and* the absence. "Redirected" and "rendered nothing yet" are different
states and a single positive assertion cannot tell them apart — which is exactly the `checking`
status bug this file pins.

User interaction goes through `userEvent.setup()`, never `fireEvent`: it produces the real event
sequence, including focus.

---

## 6. A keyboard shortcut

`event.key`, never `event.code` — on an ABNT2 layout `code` lies about which character was typed.

```ts
const user = userEvent.setup();
await user.keyboard('{Control>}k{/Control}');
```

Assert the observable outcome (the palette opened, focus landed inside it), and separately that the
control announcing the shortcut carries `aria-keyshortcuts` — the announcement and the handler are
two different bugs.

---

## 7. Injecting a fake instead of mocking a module

Live: [`servicesFacade.test.ts`](../../../../apps/admin-frontend/src/shared/api/servicesFacade.test.ts)

When the unit is already a factory, hand it a fake and skip `vi.mock` entirely — fewer moving parts
and the test doubles as documentation of the seam.

```ts
const GET = vi.fn<(path: string, init: unknown) => Promise<RawShape>>();
const api = createServicesFacade({ GET, POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } as unknown as Client<paths>);
```

What is worth asserting at this layer: that the version segment and tenant header are injected so no
caller restates them, that the envelope is unwrapped, and that each failure class normalises to the
right `ApiProblem` (`SESSION_PROBLEM` / `NETWORK_PROBLEM` / `SERVER_PROBLEM`). Never assert on a
free-text backend message — branch on `code`, same rule as production code.

---

## 8. An e2e

Live: [`e2e/auth.spec.ts`](../../../../apps/admin-frontend/e2e/auth.spec.ts)

Real stack, real login form, no mocks. Requires `dotnet run --project backend/AppHost
--launch-profile http` running from the repo root.

```ts
async function loginAsDemoUser(page: Page) {
  await page.goto('/');
  await page.waitForURL(LOGIN_URL_RE);
  await page.locator('#Email').fill(DEMO_EMAIL);
  await page.locator('#Password').fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('http://localhost:5173/');
}
```

Rules that keep these green:

- **Read seeded ids from the running system.** The demo tenant's id is generated fresh on every
  seed; the live file decodes it out of the issued access token instead of asserting a constant.
- **Prefer a reload over waiting out a real clock.** Session persistence is proven by reloading and
  re-checking, not by sleeping until a token expires.
- **Assert the negative that proves the positive.** Logout is only real if landing back on `/login`
  reaches identity-service's credentials form again — a silently restored session would bounce
  straight into the app.
- Query by role and pt-BR accessible name (`getByRole('button', { name: /sair/i })`), same as the
  component tests.
- A `data-testid` is a last resort, for a value with no accessible name of its own.
