# Quickstart: Validating the OIDC-Authenticated Admin Shell Scaffold

Run-and-verify guide for this feature's acceptance scenarios (spec.md User Stories 1–4). Contract details are in `contracts/`; entity shapes are in `data-model.md` — not duplicated here.

## Prerequisites

- Node.js `>=26.5.1` and npm `12.0.2` (repo root `.nvmrc` / `package.json`).
- .NET SDK `10.0.302` (`backend/global.json`) — required to run the Aspire AppHost.
- From repo root: `npm install` (installs all workspaces, including `apps/admin-frontend` once this feature's scaffold exists).

No dev-certificate trust step is needed — every fixed port in `backend/AppHost/AppHost.cs` (5173/5081/5080) is plain HTTP in local development.

## Running the app

**Full stack (required for any scenario that touches login)**, from repo root:

```bash
dotnet run --project backend/AppHost
```

This starts Postgres, `identity-service` (5081), `services-service` (5080), `assistant-service`, and the admin-frontend Vite dev server (5173) together, wired exactly as documented in `contracts/env-contract.md`.

**Frontend-only loop** (faster UI iteration; no live login, since identity-service isn't running):

```bash
npm run dev --workspace=apps/admin-frontend
```

## Validation scenarios

### 1. Unauthenticated visitor is redirected (→ User Story 1, SC-002)

1. With the full stack running, open `http://localhost:5173` in a fresh/incognito browser session.
2. **Expected**: the browser ends up on identity-service's OIDC login screen (`localhost:5081/connect/authorize...`); no admin-frontend authenticated content is ever visible first.

### 2. Successful login renders the tenant-scoped shell (→ User Story 2, SC-003)

1. From the login screen, sign in as the seeded demo user: `owner@demo.local` / `Passw0rd!` (identity-service's `DemoTenant` — see `research.md` Decision 12).
2. **Expected**: redirected through `http://localhost:5173/callback` to `/`; the authenticated shell (layout + placeholder navigation, no business content per FR-013) renders; the tenant context in use (see `data-model.md` Tenant Context) matches the `tenant_id` claim on the issued access token — the demo tenant's id is generated fresh (`Guid.CreateVersion7()`) whenever the database is seeded, so it differs per environment rather than being a fixed value.

### 3. Silent renewal and logout (→ User Story 3, SC-004)

1. Stay on the shell past the access token's expiry (check identity-service's configured token lifetime in its own config — not restated here, as adjusting it is outside this feature's scope).
2. **Expected**: no forced redirect to login occurs; the session renews silently.
3. Trigger logout from the shell's navigation.
4. **Expected**: redirected through identity-service's `/connect/logout` back to `http://localhost:5173/login`; navigating back to `/` afterward redirects to login again (session fully cleared, both locally and at identity-service).

### 4. Contributor tooling passes on a clean checkout (→ User Story 4, SC-005)

From repo root, after `npm ci`:

```bash
npm run lint --workspace=apps/admin-frontend
npm run format:check --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend
npm run test:coverage --workspace=apps/admin-frontend
```

**Expected**: each command completes and reports a clean pass (not a crash or missing-script error) against the untouched scaffold.

### 5. End-to-end (Playwright, real OIDC login)

With the full stack running:

```bash
npm exec --workspace=apps/admin-frontend -- playwright install --with-deps chromium
npm run test:e2e --workspace=apps/admin-frontend
```

**Expected**: the suite drives an actual interactive login as the demo user (research.md Decision 12) and passes — this is the constitution's required "real (non-mocked) OIDC smoke test."

### 6. API contract drift check

With `services-service` running (via the full stack):

```bash
npm run generate:api-types:check --workspace=apps/admin-frontend
```

**Expected**: passes with zero drift on a freshly generated scaffold (see `contracts/api-client-contract.md`).

## Known gaps carried forward from research

- Silent renewal and the Playwright login both depend on identity-service's `DemoTenant` seed staying enabled in `appsettings.Development.json` — if it's ever removed, scenario 2, 3, and 5 above break (research.md Decision 12).
- OIDC discovery (`/.well-known/openid-configuration`) is assumed live based on OpenIddict defaults; if it proves unavailable during implementation, `authClient.ts` has a documented fallback to explicit endpoint configuration (research.md Decision 13).
