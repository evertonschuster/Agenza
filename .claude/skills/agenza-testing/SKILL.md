---
name: agenza-testing
description: Use when writing or changing tests in apps/admin-frontend — picking between a plain unit test, a store test, a hook test, a component test and a Playwright e2e; mocking a module with vi.mock / vi.hoisted; testing a page and its hook; or unblocking a red coverage threshold from npm run test:coverage.
---

# Testing — admin-frontend

The toolchain and the gate list are in
[`docs/ARCHITECTURE.md` §7](../../../apps/admin-frontend/docs/ARCHITECTURE.md); the exact thresholds
and exclusions are in [`vitest.config.ts`](../../../apps/admin-frontend/vitest.config.ts). Read the
config for numbers — never a copy of them. This file is how to choose a tier and write it in the
house style. Worked examples: [`references/patterns.md`](references/patterns.md).

## 1. Pick the tier

Cheapest tier that can fail for the right reason.

| What you are testing | Tier | Notes |
| --- | --- | --- |
| Pure function, reducer, resolver (`reduceSession`, `resolveTheme`) | plain unit, **zero mocks** | fixtures only |
| Module-singleton store (`sessionStore`, `themeStore`) | unit + `reset()` in `beforeEach` | state leaks between tests otherwise |
| Hook over a store or context | `renderHook` + a `wrapper` | `act()` around anything that dispatches |
| A page | **its hook**, not the shell | see below |
| Component whose behaviour is routing or context-driven | RTL `render` inside `MemoryRouter` / the provider | assert on visible pt-BR text and accessible names |
| The real login, the real backend, an axe audit | Playwright e2e in `e2e/` | needs the Aspire stack up |

**Testing a page shell vs its hook.** A `<Page>.tsx` holds no `useState`/`useEffect`/`useRef` — all
of it lives in `use<Page>.ts` (ARCHITECTURE §1). So there is nothing in the shell to unit-test.
Either test the hook directly with `renderHook`, or render the page inside its provider and assert
the *observable* consequence — the redirect that happened, the effect that fired exactly once.
[`LoginPage.test.tsx`](../../../apps/admin-frontend/src/features/auth/ui/pages/LoginPage/LoginPage.test.tsx)
is one assertion long for this reason.

**Purity is proven by mock-free tests, not by folder name.** That is the repo's own phrasing and it
is a design check, not a slogan: if a thing in `model/` or `shared/session/` needs a mock to test,
the wrong dependency crossed a layer. `reduceSession` is testable with plain `SessionPrincipal`
fixtures precisely because it carries no `oidc-client-ts` reference, not even `import type`.

## 2. House style

- **Colocated.** `foo.test.ts` sits next to `foo.ts`. There is no `__tests__/` and no `tests/` root.
  Shared fixtures — and only fixtures — live in
  [`src/test/`](../../../apps/admin-frontend/src/test/oidcUser.ts).
- **Module mocks only: `vi.mock` / `vi.hoisted`. Never network-level mocking.** `msw` was removed
  because it was never wired (ARCHITECTURE §5). Mock the module boundary (`../api/authClient`), stub
  a client object, or hand a fake client to a factory — do not intercept `fetch`.
- `vi.mock` is hoisted above imports, so any mock function referenced inside the factory must come
  from `vi.hoisted`. **The mock path resolves relative to the test file**, not to the module under
  test — this is the most common reason a mock silently doesn't apply.
- **`src/vitest-setup.ts` already does two things for you**: it mocks `@/shared/logger` and stubs the
  six `VITE_*` vars so `shared/env.ts`'s fail-fast doesn't trip. Don't re-stub them. To assert on
  logging, import `logger` and assert on the mock.
- `beforeEach` does `vi.clearAllMocks()` plus a reset of any module singleton you touched.
- **StrictMode is a test case, not a wrapper you add everywhere.** React 19 double-invokes effects;
  a "runs once per mount" guarantee is only proven by rendering inside `<StrictMode>` and asserting
  the call count.
- Assertions read pt-BR because the UI is pt-BR: `getByRole('button', { name: 'Tentar novamente' })`.
  Identifiers stay English.
- Test names state the behaviour and, when it exists, the requirement it pins
  (`(spec FR-009)`). Grep-ability is the point.
- Shortcut tests must match on `event.key`, never `event.code` — ABNT2 keyboards.

## 3. The coverage gate

CI runs `test:coverage`, and the thresholds in `vitest.config.ts` are a **real gate**: below them the
job fails. They were set with headroom so a genuine regression fails without small-file noise
tripping it. Do not lower a threshold to land a PR.

What is excluded, and the reasoning behind each class — the actual list is in the config:

| Excluded | Why |
| --- | --- |
| `src/shared/ui/**` | coverage measures **logic**, not `cva` markup |
| composition roots (`main.tsx`, `App.tsx`, `routes.tsx`) and slice barrels | wiring; nothing to assert that a render test doesn't already cover |
| generated OpenAPI types, fixtures under `src/test/` | not authored logic |

**The corollary matters more than the rule: if a thing has behaviour, it does not belong in
`shared/ui/`.** Put it in `shared/` (`shared/theme/`, `shared/keyboard/`, `shared/hooks/`) where it
is measured and must be tested. A primitive that grew a `useEffect`, a store subscription or a
keyboard handler is telling you the logic wants to move out, not that the exclusion should widen.

**Named failure mode:** the `src/shared/ui/**` exclusion is
[T050](../../../apps/admin-frontend/specs/002-ui-foundation/tasks.md) and lands **before the first
primitive**. Add primitives first and coverage drops on untestable markup, CI goes red, and it reads
like a regression in code that was never at fault. Same shape when a shell file is deleted: swap its
exclusion for the new equivalent in the same PR (T083), or the config quietly describes files that
no longer exist.

## 4. What not to test

- Presentational markup and `cva` variant permutations. A snapshot of class strings fails on every
  restyle and catches nothing.
- Third-party primitive behaviour. Base UI's dialog already closes on `Esc`; test *your* wiring
  (that the trigger opens it, that focus returns where you sent it), not theirs.
- The framework. `MemoryRouter` navigates; `useSyncExternalStore` re-renders.
- Ceremonial tests written to move the coverage number. They make the gate lie.

## 5. Playwright e2e

`e2e/` runs against the **real Aspire-orchestrated stack** with a real identity-service login and no
mocks — that is the point of it (constitution, Principle V). Consequences when you write one:

- **The stack must be up**: `dotnet run --project backend/AppHost --launch-profile http` from the
  repo root. See [`README.md`](../../../apps/admin-frontend/README.md) for the demo credentials.
- **There is no fixture to fake auth.** You drive identity-service's actual login form. Reuse the
  `loginAsDemoUser` helper in
  [`e2e/auth.spec.ts`](../../../apps/admin-frontend/e2e/auth.spec.ts) rather than re-typing it.
- `webServer.reuseExistingServer` is true so Playwright reuses the Vite server Aspire already started
  instead of racing it for port 5173. Don't start a second dev server.
- Seeded ids are generated fresh per environment — **never assert a hardcoded tenant id**; read it
  from the token actually issued to the session, as `auth.spec.ts` does.
- One worker, no parallelism: the suite shares one backend and one seeded user. Keep it that way.
