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

| Piece                                              | Status    | Notes                                                                                              |
| -------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| TypeScript strict config                           | `done`    |                                                                                                    |
| ESLint + Prettier                                  | `done`    |                                                                                                    |
| Vitest + RTL + MSW                                 | `done`    |                                                                                                    |
| Local Git hooks                                    | `removed` | Quality gates run explicitly during development and in required CI checks                          |
| `HttpClient` interface + `AuthenticatedHttpClient` | `done`    | Single per-request session read (token + tenant id together); converts every failure to `AppError` |
| MSW handlers (auth)                                | `stub`    | Auth uses OIDC not REST — no handlers needed                                                       |
| MSW handlers (Categories/Services)                 | `done`    | `categoryHandlers.ts`/`serviceHandlers.ts`                                                         |
| MSW handlers (remaining REST features)             | `stub`    | Add per-feature as specs arrive (Clients, Appointments, Inbox, Settings)                           |
| shadcn/ui design system (`src/components/ui/`)     | `done`    | Radix-based, stock "Nova"/neutral theme, unmodified; see ADR 005                                   |
| `ThemeProvider` / `useTheme` / `ThemeToggle`       | `done`    | Light/dark, defaults to OS preference, persists an override                                        |

---

## Auth vertical

| Piece                         | Status | Notes                                                                                                                  |
| ----------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| `Tenant` value object         | `done` |                                                                                                                        |
| `User` entity                 | `done` | email/name are unverified assumptions                                                                                  |
| `Session` entity              | `done` |                                                                                                                        |
| `AuthRepository` interface    | `done` |                                                                                                                        |
| `InitiateLogin` use case      | `done` |                                                                                                                        |
| `HandleAuthCallback` use case | `done` | OIDC failures arrive as classified `AuthFlowError` values (see ADR 007)                                                |
| `GetCurrentSession` use case  | `done` |                                                                                                                        |
| `Logout` use case             | `done` |                                                                                                                        |
| `mapOidcUserToSession` mapper | `done` | tenant_id claim name unverified                                                                                        |
| `OidcAuthRepository`          | `done` | 60s single-flight renewal; rejects renewed user/tenant claim changes                                                   |
| `createUserManager` factory   | `done` | env vars are placeholders                                                                                              |
| `createAppContainer`          | `done` |                                                                                                                        |
| `AppProviders`                | `done` |                                                                                                                        |
| `useAsync` hook               | `done` |                                                                                                                        |
| `useAuth` hook                | `done` |                                                                                                                        |
| `useAppContainer` hook        | `done` |                                                                                                                        |
| `ProtectedRoute`              | `done` |                                                                                                                        |
| `LoginPage`                   | `done` | automatic OIDC redirect with progress, classified recovery, and support codes                                          |
| `CallbackPage`                | `done` | restores the interrupted route; classified recovery and support codes                                                  |
| `AdminLayout` + sidebar       | `done` | Collapsible icon rail (desktop, persisted) + off-canvas drawer (mobile, below `md`); theme toggle + sign-out in footer |
| Router                        | `done` |                                                                                                                        |

---

## Feature verticals

### Tags

Removed from the frontend — see `docs/adr/016-remove-tags-frontend.md`. The
backend `Tag` domain entity and `/api/v1/tags` endpoints are intentionally
retained (project-owner decision), just no longer surfaced or consumed by
this app.

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

**Dependency:** none structurally — depends on Categories for the create/edit
form's category picker. The backend `ServiceDto` still has `tags`/`tagIds`
(docs/API.md) since the backend Tag domain was kept; the frontend has no
Tag entity or picker anymore (docs/adr/016), so a tag-selection UI needs to
be designed when this form is actually built.

---

### Categories

| Piece                                           | Status | Notes                                                                          |
| ----------------------------------------------- | ------ | ------------------------------------------------------------------------------ |
| `Category` entity                               | `done` |                                                                                |
| `CategoryRepository` interface                  | `done` |                                                                                |
| Use cases (List, Create, Update, Delete)        | `done` |                                                                                |
| `ApiCategoryRepository` + `categoryMapper`      | `done` |                                                                                |
| `useCategories` hook                            | `done` |                                                                                |
| Categories responsive list/editor + nav entry   | `done` | Mobile-ready table; shared URL-driven create/edit modal; delete with confirm   |
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

**Blocked on:** API spec (`HttpClient` already exists, not a blocker).
**Dependency:** None structurally, but Appointments history view will depend on Appointments.

---

### Appointments

| Piece                | Status | Notes |
| -------------------- | ------ | ----- |
| `Appointment` entity | `stub` |       |
| Use cases            | `stub` |       |
| Infrastructure       | `stub` |       |
| `AppointmentsPage`   | `stub` |       |

**Blocked on:** API spec, Services (for service selection in create form) — `HttpClient` already exists, not a blocker.
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

**Blocked on:** API spec (`HttpClient` already exists, not a blocker). Real-time requirement (polling vs WebSocket) TBD.
**Dependency:** Clients (for linking conversations to clients).

---

### Settings

| Piece             | Status | Notes |
| ----------------- | ------ | ----- |
| `Business` entity | `stub` |       |
| Use cases         | `stub` |       |
| Infrastructure    | `stub` |       |
| `SettingsPage`    | `stub` |       |

**Blocked on:** API spec (`HttpClient` already exists, not a blocker).
**Dependency:** None — can be built any time.

---

## Recommended build order

```
1. HttpClient (unblocks all REST features)          [done]
2. Categories  (no dependencies, simplest CRUD)      [done]
3. Services    (depends on Categories for its form pickers) [done]
4. Clients     (simple CRUD)
5. Appointments (depends on Services for create form)
6. Inbox       (depends on Clients)
7. Dashboard   (depends on Appointments + Inbox for overview data)
8. Settings    (independent, can be done any time after HttpClient)
```

Tags was previously vertical #2 here (first REST vertical, no dependencies)
but was removed from the frontend — see `docs/adr/016-remove-tags-frontend.md`.

---

## Test counts

| Session                                                                                                                                   | Tests added                            | Total                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| Initial setup                                                                                                                             | 0                                      | 0                                          |
| Domain (Tenant, User, Session)                                                                                                            | 17                                     | 17                                         |
| Application (4 use cases)                                                                                                                 | 7                                      | 24                                         |
| Infrastructure (mapper + OidcAuthRepository)                                                                                              | 13                                     | 37                                         |
| Composition + hooks (useAsync, useAuth, useAppContainer)                                                                                  | 10                                     | 47                                         |
| Presentation (ProtectedRoute, LoginPage)                                                                                                  | 6                                      | 53                                         |
| HttpClient (AuthenticatedHttpClient via MSW)                                                                                              | 6                                      | 59                                         |
| Coverage hardening (CallbackPage, AdminLayout, container, AppProviders, createUserManager)                                                | 14                                     | 73                                         |
| Tags vertical + UI system (shadcn/ui migration, dark mode, mobile-responsive `AdminLayout`)                                               | not logged incrementally               | 116 (verified via `npm run test`)          |
| UI reset to stock shadcn theme + Tags list/form → `Table`/`Dialog`                                                                        | 0 (existing tests updated, none added) | 116 (verified via `npm run test`)          |
| Categories + Services verticals (entities, use cases, repos, mappers, hooks, pages)                                                       | 75                                     | 191 (verified via `npm run test`)          |
| Auth/tenant safety rewrite, error taxonomy, AppContainer facade split, ServicesPage decomposition (docs/adr/006-008)                      | 211                                    | 402 (verified via `npm run test`)          |
| Lint hardening to zero warnings, `test:coverage` thresholds raised (branches/functions added), Playwright E2E suite added                 | 24                                     | 426 (verified via `npm run test:coverage`) |
| jest-axe broadened from TagForm to LoginPage and ServicesPage's create-service dialog                                                     | 2                                      | 428 (verified via `npm run test:coverage`) |
| Architectural refactor: atomic session snapshot, `useAsync` simplification, Services/Tags/Categories decomposition, ADR 009 physical move | 23                                     | 451 (verified via `npm run test:coverage`) |
| Automatic OIDC transition, actionable auth feedback, and renewed-identity isolation                                                       | not logged incrementally               | 550 (verified via `npm run test:coverage`) |

Update the test count row whenever a feature vertical is completed. The
550 above is Vitest only — see "End-to-end tests" below for the separate
Playwright suite (9 specs), which isn't counted in this table or in the
coverage gate.

**Architecture:** docs/adr/009's feature-based `features/{auth,catalog}` +
`app/` + `shared/` reorganization is executed and `Accepted` — new code
lands in that structure (see `agent-skills/agenza-frontend-feature` for
the current tree), not in a top-level `presentation/`/`application/`/
`infrastructure/`/`domain/`/`composition/`.

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

- Unauthenticated access to a protected route or `/` automatically opens
  the OIDC provider.
- The automatic login-transition screen explains the redirect, renders
  correctly in dark mode, forwards the active theme to the OIDC provider,
  and has no horizontal overflow at 375px. The identity credential page
  applies that theme before paint and provides its own accessible,
  persisted theme toggle.
- The authenticated shell: index → `/dashboard` redirect, sidebar
  navigation, and logout (mocking the OIDC discovery document + end-session
  redirect, not just a REST endpoint, so the real `OidcAuthRepository` runs
  unmodified).
  **Deliberately not duplicated here** (already covered at the unit level,
  listed so the gap is explicit rather than silent): the OIDC callback's
  idempotency under `StrictMode` (`CallbackPage.test.tsx`,
  `HandleAuthCallback.test.ts`), tenant-switch races in `useAsync`/
  `useCreateInline` (their own dedicated test files), and cross-tenant/
  cross-session visual bleed (`TenantBoundary.test.tsx`). Categories/Services
  CRUD aren't E2E-tested separately — they share the same `useAsync`/
  repository/mapper machinery already exercised at the unit level. A full
  create → edit → delete E2E flow (previously `tags-crud.spec.ts`) and a
  failed-refetch-retry flow (previously `tags-list-retry.spec.ts`) existed
  for Tags and were removed along with the vertical
  (docs/adr/016-remove-tags-frontend.md) — no other vertical has picked up
  that full-CRUD E2E coverage yet.

**Not yet wired into CI** (`.github/workflows/frontend-ci.yml`): doing so
would need `npx playwright install --with-deps chromium` added as a step
and `VITE_API_BASE_URL`/`VITE_OIDC_*` provided in the runner (today only
`.env.local`, which is gitignored, supplies them locally) — a reasonable
follow-up, deferred rather than added speculatively.

---

## Bundle size baseline

First recorded 2026-07-21; re-measured 2026-07-24 after the automatic
authentication transition and feedback work — captured from
`npm run build --workspace=apps/admin-frontend` (Vite 8, production build).

| Chunk                                                   | Raw       | Gzip     |
| ------------------------------------------------------- | --------- | -------- |
| `index-*.js` (main entry)                               | 227.55 kB | 71.67 kB |
| `auth-*.js` (OIDC/auth route dependencies)              | 229.03 kB | 69.80 kB |
| `DeleteConfirmationDialog-*.js` (shared table + dialog) | 105.65 kB | 31.59 kB |
| `ServicesPage-*.js`                                     | 96.24 kB  | 30.57 kB |
| `index-*.css`                                           | 65.11 kB  | 10.99 kB |

All other route chunks (Categories pages and forms, stub pages) are
under 10 kB raw each. Vite now emits the OIDC/auth dependency graph as its
own shared chunk; `index` + `auth` remain approximately the same combined
size as the previous monolithic main entry. The feedback UI added no heavy
dependency.

No pathological duplication was found (e.g. no repeated Radix/shadcn
tree across chunks), so no bundle-splitting work was done against this
baseline — only re-measure and revisit if a future change pushes a
number up materially.

Update this table whenever a change is expected to move the numbers
meaningfully (a new heavy dependency, a new route, code-splitting
work) — not on every commit.
