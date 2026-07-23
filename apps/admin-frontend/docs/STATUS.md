# Feature Status

Machine-readable current state of all feature verticals. Update this
file whenever a feature moves from one state to another.

Agents: read this before starting any work to understand what exists,
what's blocked, and what order to build things in.

---

## Status legend

- `done` — fully implemented, tested, lint clean, committed
- `stub` — route exists, page renders "under construction", no logic built
- `blocked` — cannot start until a dependency is resolved
- `in-progress` — currently being built (update when starting work)

---

## Infrastructure

| Piece                                              | Status | Notes                                                            |
| -------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| TypeScript strict config                           | `done` |                                                                  |
| ESLint + Prettier                                  | `done` |                                                                  |
| Vitest + RTL + MSW                                 | `done` |                                                                  |
| Husky + lint-staged                                | `done` |                                                                  |
| `HttpClient` interface + `AuthenticatedHttpClient` | `done` | Bearer token via AuthRepository, ApiError/UnauthenticatedError   |
| MSW handlers (auth)                                | `stub` | Auth uses OIDC not REST — no handlers needed                     |
| MSW handlers (REST features)                       | `stub` | Add per-feature as specs arrive                                  |
| shadcn/ui design system (`src/components/ui/`)     | `done` | Radix-based, stock "Nova"/neutral theme, unmodified; see ADR 005 |
| `ThemeProvider` / `useTheme` / `ThemeToggle`       | `done` | Light/dark, defaults to OS preference, persists an override      |

---

## Auth vertical

| Piece                         | Status | Notes                                                                                                                  |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `Tenant` value object         | `done` |                                                                                                                        |
| `User` entity                 | `done` | email/name are unverified assumptions                                                                                  |
| `Session` entity              | `done` |                                                                                                                        |
| `AuthRepository` interface    | `done` |                                                                                                                        |
| `InitiateLogin` use case      | `done` |                                                                                                                        |
| `HandleAuthCallback` use case | `done` | errors propagated unwrapped (see DECISIONS.md)                                                                         |
| `GetCurrentSession` use case  | `done` |                                                                                                                        |
| `Logout` use case             | `done` |                                                                                                                        |
| `mapOidcUserToSession` mapper | `done` | tenant_id claim name unverified                                                                                        |
| `OidcAuthRepository`          | `done` |                                                                                                                        |
| `createUserManager` factory   | `done` | env vars are placeholders                                                                                              |
| `createAppContainer`          | `done` |                                                                                                                        |
| `AppProviders`                | `done` |                                                                                                                        |
| `useAsync` hook               | `done` |                                                                                                                        |
| `useAuth` hook                | `done` |                                                                                                                        |
| `useAppContainer` hook        | `done` |                                                                                                                        |
| `ProtectedRoute`              | `done` |                                                                                                                        |
| `LoginPage`                   | `done` |                                                                                                                        |
| `CallbackPage`                | `done` |                                                                                                                        |
| `AdminLayout` + sidebar       | `done` | Collapsible icon rail (desktop, persisted) + off-canvas drawer (mobile, below `md`); theme toggle + sign-out in footer |
| Router                        | `done` |                                                                                                                        |

---

## Feature verticals

### Tags

| Piece                                    | Status | Notes                                                    |
| ---------------------------------------- | ------ | -------------------------------------------------------- |
| `Tag` entity                             | `done` |                                                          |
| `TagRepository` interface                | `done` |                                                          |
| Use cases (List, Create, Update, Delete) | `done` |                                                          |
| `ApiTagRepository` + `tagMapper`         | `done` |                                                          |
| `useTags` hook                           | `done` |                                                          |
| `TagsPage` + nav entry                   | `done` | Table list, dialog create/edit form, delete with confirm |
| Backend (services-service `/api/tags`)   | `done` | First real vertical in services-service                  |

**Dependency:** none. First REST vertical built end-to-end (backend + frontend).

---

### Services

| Piece                                         | Status | Notes                                                                                         |
| --------------------------------------------- | ------ | --------------------------------------------------------------------------------------------- |
| `Service` entity                              | `done` | Duration range + discount-cap invariants validated in `create()`                              |
| `ServiceRepository` interface                 | `done` |                                                                                               |
| Use cases (List, Create, Update, Delete)      | `done` |                                                                                               |
| `ApiServiceRepository` + `serviceMapper`      | `done` |                                                                                               |
| `useServices` hook                            | `done` |                                                                                               |
| `ServicesPage` + `ServiceForm` + nav entry    | `done` | Table list, dialog create/edit form (category `Select`, tag toggle grid), delete with confirm |
| Backend (services-service `/api/v1/services`) | `done` | Search/filter/pagination added; see docs/adr/0012 for the latest validation/handler shape     |

**Dependency:** none structurally — depends on Categories and Tags for the
create/edit form's pickers, both already built.

---

### Categories

| Piece                                           | Status | Notes                                                                          |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `Category` entity                               | `done` |                                                                                |
| `CategoryRepository` interface                  | `done` |                                                                                |
| Use cases (List, Create, Update, Delete)        | `done` |                                                                                |
| `ApiCategoryRepository` + `categoryMapper`      | `done` |                                                                                |
| `useCategories` hook                            | `done` |                                                                                |
| `CategoriesPage` + nav entry                    | `done` | Table list, dialog create/edit form, delete with confirm                       |
| Backend (services-service `/api/v1/categories`) | `done` | Search/filter added; see docs/adr/0012 for the latest validation/handler shape |

**Dependency:** none. Referenced by Services (optional `categoryId`).

---

### Clients

| Piece           | Status | Notes |
| --------------- | ------ | ----- |
| `Client` entity | `stub` |       |
| Use cases       | `stub` |       |
| Infrastructure  | `stub` |       |
| `ClientsPage`   | `stub` |       |

**Blocked on:** API spec, `HttpClient`.
**Dependency:** None structurally, but Appointments history view will depend on Appointments.

---

### Appointments

| Piece                | Status | Notes |
| -------------------- | ------ | ----- |
| `Appointment` entity | `stub` |       |
| Use cases            | `stub` |       |
| Infrastructure       | `stub` |       |
| `AppointmentsPage`   | `stub` |       |

**Blocked on:** API spec, `HttpClient`, Services (for service selection in create form).
**Dependency:** Services should be built first.

---

### Dashboard

| Piece           | Status | Notes |
| --------------- | ------ | ----- |
| `DashboardPage` | `stub` |       |

**Blocked on:** API spec, Appointments (for today's overview), Conversations (for inbox summary).
**Dependency:** Build after Appointments and Inbox.

---

### Inbox (Conversations)

| Piece                 | Status | Notes |
| --------------------- | ------ | ----- |
| `Conversation` entity | `stub` |       |
| `Message` entity      | `stub` |       |
| Use cases             | `stub` |       |
| Infrastructure        | `stub` |       |
| `InboxPage`           | `stub` |       |

**Blocked on:** API spec, `HttpClient`. Real-time requirement (polling vs WebSocket) TBD.
**Dependency:** Clients (for linking conversations to clients).

---

### Settings

| Piece             | Status | Notes |
| ----------------- | ------ | ----- |
| `Business` entity | `stub` |       |
| Use cases         | `stub` |       |
| Infrastructure    | `stub` |       |
| `SettingsPage`    | `stub` |       |

**Blocked on:** API spec, `HttpClient`.
**Dependency:** None — can be built any time after HttpClient exists.

---

## Recommended build order

```
1. HttpClient (unblocks all REST features)          [done]
2. Tags        (no dependencies, first REST vertical) [done]
3. Categories  (no dependencies, simplest CRUD)      [done]
4. Services    (depends on Categories + Tags for its form pickers) [done]
5. Clients     (simple CRUD)
6. Appointments (depends on Services for create form)
7. Inbox       (depends on Clients)
8. Dashboard   (depends on Appointments + Inbox for overview data)
9. Settings    (independent, can be done any time after HttpClient)
```

---

## Test counts

| Session                                                                                                                   | Tests added                            | Total                                      |
| ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| Initial setup                                                                                                             | 0                                      | 0                                          |
| Domain (Tenant, User, Session)                                                                                            | 17                                     | 17                                         |
| Application (4 use cases)                                                                                                 | 7                                      | 24                                         |
| Infrastructure (mapper + OidcAuthRepository)                                                                              | 13                                     | 37                                         |
| Composition + hooks (useAsync, useAuth, useAppContainer)                                                                  | 10                                     | 47                                         |
| Presentation (ProtectedRoute, LoginPage)                                                                                  | 6                                      | 53                                         |
| HttpClient (AuthenticatedHttpClient via MSW)                                                                              | 6                                      | 59                                         |
| Coverage hardening (CallbackPage, AdminLayout, container, AppProviders, createUserManager)                                | 14                                     | 73                                         |
| Tags vertical + UI system (shadcn/ui migration, dark mode, mobile-responsive `AdminLayout`)                               | not logged incrementally               | 116 (verified via `npm run test`)          |
| UI reset to stock shadcn theme + Tags list/form → `Table`/`Dialog`                                                        | 0 (existing tests updated, none added) | 116 (verified via `npm run test`)          |
| Categories + Services verticals (entities, use cases, repos, mappers, hooks, pages)                                       | 75                                     | 191 (verified via `npm run test`)          |
| Auth/tenant safety rewrite, error taxonomy, AppContainer facade split, ServicesPage decomposition (docs/adr/006-008)      | 211                                    | 402 (verified via `npm run test`)          |
| Lint hardening to zero warnings, `test:coverage` thresholds raised (branches/functions added), Playwright E2E suite added | 24                                     | 426 (verified via `npm run test:coverage`) |
| jest-axe broadened from TagForm to LoginPage and ServicesPage's create-service dialog                                     | 2                                      | 428 (verified via `npm run test:coverage`) |

Update the test count row whenever a feature vertical is completed. The
428 above is Vitest only — see "End-to-end tests" below for the separate
Playwright suite (9 specs), which isn't counted in this table or in the
coverage gate.

**Pending architectural follow-up:** docs/adr/009 specifies a feature-based
`features/{auth,catalog}` + `app/` + `shared/` reorganization (target tree
and full migration runbook there) — decided but not yet physically moved;
see that ADR before starting unrelated work in `presentation/`,
`application/`, or `infrastructure/` so new files land in the right place
once the move happens.

---

## End-to-end tests

`e2e/` holds a Playwright suite (`npm run test:e2e`, `npm run test:e2e:ui`
for the interactive runner) that runs against the **production build**
(`vite build` + `vite preview`, wired as `playwright.config.ts`'s
`webServer`) rather than `vite dev` — several specs count exactly how many
times a mocked endpoint is hit, and React's StrictMode double-invokes
effects in development only, which would make those counts nondeterministic
against the dev server.

Every spec mocks its own backend via `page.route()` and, where a signed-in
session is needed, writes an oidc-client-ts user record straight into
localStorage (`e2e/support/session.ts`) — no identity-service,
services-service, or Postgres needs to be running. Covered so far:

- Unauthenticated access to a protected route or `/` redirects to `/login`.
- `LoginPage` renders correctly in dark mode and at a 375px viewport.
- The authenticated shell: index → `/dashboard` redirect, sidebar
  navigation, and logout (mocking the OIDC discovery document + end-session
  redirect, not just a REST endpoint, so the real `OidcAuthRepository` runs
  unmodified).
- Tags: full create → edit → delete flow through the real
  `HttpClient`/repository/mapper stack (not a faked `AppContainer`, unlike
  the unit tests).
- Tags list: a failed refetch keeps showing the last known-good data with a
  retry action, and retry recovers.

**Deliberately not duplicated here** (already covered at the unit level,
listed so the gap is explicit rather than silent): the OIDC callback's
idempotency under `StrictMode` (`CallbackPage.test.tsx`,
`HandleAuthCallback.test.ts`), tenant-switch races in `useAsync`/
`useCreateInline` (their own dedicated test files), and cross-tenant/
cross-session visual bleed (`TenantBoundary.test.tsx`). Categories/Services
CRUD aren't E2E-tested separately — Tags is the reference flow and the
other two verticals share the same `useAsync`/repository/mapper
machinery already exercised there and at the unit level.

**Not yet wired into CI** (`.github/workflows/frontend-ci.yml`): doing so
would need `npx playwright install --with-deps chromium` added as a step
and `VITE_API_BASE_URL`/`VITE_OIDC_*` provided in the runner (today only
`.env.local`, which is gitignored, supplies them locally) — a reasonable
follow-up, deferred rather than added speculatively.

---

## Bundle size baseline

No bundle-size measurement or documentation existed anywhere in this
repo before 2026-07-21 — the numbers below are the **first** recorded
baseline, captured from `npm run build --workspace=apps/admin-frontend`
(Vite 8, production build) after the Tags/Categories/Services verticals
and the OpenAPI-generated-types/accessibility/error-handling hardening
pass. They are not a confirmation of any prior figure.

| Chunk                       | Raw       | Gzip      |
| --------------------------- | --------- | --------- |
| `index-*.js` (main entry)   | 447.82 kB | 137.38 kB |
| `ServicesPage-*.js`         | 93.51 kB  | 29.58 kB  |
| `table-*.js` (shared table) | 103.84 kB | 30.78 kB  |
| `index-*.css`               | 63.32 kB  | 10.85 kB  |

All other route chunks (Categories/Tags pages and forms, stub pages)
are under 5 kB raw each — lazy-loaded per route, not part of the
initial load.

No pathological duplication was found (e.g. no repeated Radix/shadcn
tree across chunks), so no bundle-splitting work was done against this
baseline — only re-measure and revisit if a future change pushes a
number up materially.

Update this table whenever a change is expected to move the numbers
meaningfully (a new heavy dependency, a new route, code-splitting
work) — not on every commit.
