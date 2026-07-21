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

| Session                                                                                     | Tests added                            | Total                             |
| ------------------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------- |
| Initial setup                                                                               | 0                                      | 0                                 |
| Domain (Tenant, User, Session)                                                              | 17                                     | 17                                |
| Application (4 use cases)                                                                   | 7                                      | 24                                |
| Infrastructure (mapper + OidcAuthRepository)                                                | 13                                     | 37                                |
| Composition + hooks (useAsync, useAuth, useAppContainer)                                    | 10                                     | 47                                |
| Presentation (ProtectedRoute, LoginPage)                                                    | 6                                      | 53                                |
| HttpClient (AuthenticatedHttpClient via MSW)                                                | 6                                      | 59                                |
| Coverage hardening (CallbackPage, AdminLayout, container, AppProviders, createUserManager)  | 14                                     | 73                                |
| Tags vertical + UI system (shadcn/ui migration, dark mode, mobile-responsive `AdminLayout`) | not logged incrementally               | 116 (verified via `npm run test`) |
| UI reset to stock shadcn theme + Tags list/form → `Table`/`Dialog`                          | 0 (existing tests updated, none added) | 116 (verified via `npm run test`) |
| Categories + Services verticals (entities, use cases, repos, mappers, hooks, pages)         | 75                                     | 191 (verified via `npm run test`) |

Update the test count row whenever a feature vertical is completed.
