# Feature Specification: OIDC-Authenticated Admin Shell Scaffold

**Feature Branch**: `001-oidc-shell-scaffold`

**Created**: 2026-08-18

**Status**: Draft

**Input**: User description: "Outcome: scaffold funcional do admin-frontend (Vite + React + TypeScript) em apps/admin-frontend, partindo de pasta vazia, rodando via Aspire, com shell autenticado via OIDC contra o identity-service.

Escopo: setup do projeto e tooling (ESLint, Prettier, Vitest, Playwright, tsconfig strict); fluxo de login/logout/renovação silenciosa via OIDC; shell autenticado vazio (layout + navegação básica); resolução de tenant a partir do token.

Fora de escopo: features de negócio (Categories/Services/Clients/etc.), escolha de biblioteca de UI além do mínimo pro shell renderizar, geração do cliente OpenAPI completo (pode ser stub inicial).

Regras de negócio: nenhuma rota autenticada é alcançável sem sessão válida; tenant é sempre resolvido no claim do token validado, nunca aceito de input do cliente.

Auth/tenant: OIDC contra identity-service; access token carrega claim de tenant; app nunca confia em tenant id vindo de query/param/localStorage.

Critérios de aceite: `npm run dev` serve o app na porta 5173 via Aspire; usuário não autenticado é redirecionado pro login do identity-service; após login, o shell autenticado renderiza; ESLint/Prettier/tsc/Vitest passam localmente; gate de cobertura configurado (mesmo que trivial nesse estágio)."

## Clarifications

### Session 2026-08-18

- Q: Should the spec explicitly state, as a hard constraint, that this feature builds the admin-frontend from a completely empty directory — with no pre-existing app code, configuration, or tooling to migrate or preserve? → A: Yes — add an explicit Assumption/constraint that this is a from-scratch build: no pre-existing app code, tooling config, or CI wiring for admin-frontend exists yet.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Unauthenticated visitor is redirected to identity-service login (Priority: P1)

Any visitor who opens the admin-frontend without a valid session is sent to the identity-service's OIDC login instead of seeing any application content.

**Why this priority**: This is the core security guarantee of the feature — without it, "authenticated shell" is a meaningless label. It is also fully verifiable before any shell UI is built, making it the right first slice.

**Independent Test**: Open the admin-frontend with no existing session (fresh browser/incognito) and confirm the browser ends up on the identity-service login screen, with no admin-frontend authenticated content ever rendered.

**Acceptance Scenarios**:

1. **Given** a visitor with no active session, **When** they navigate to any admin-frontend URL, **Then** they are redirected to the identity-service OIDC login screen.
2. **Given** a visitor whose session token has expired and cannot be silently renewed, **When** they attempt to interact with an authenticated route, **Then** they are redirected to the identity-service OIDC login screen.

---

### User Story 2 - Logged-in user sees the authenticated shell scoped to their tenant (Priority: P1)

After completing login at identity-service, the user is returned to the admin-frontend and sees the authenticated shell (layout + basic navigation), with the tenant resolved from their token.

**Why this priority**: This is the actual deliverable of the scaffold — proof that the OIDC round-trip and tenant resolution work end-to-end, not just that access is blocked.

**Independent Test**: Complete a real login against identity-service and confirm the shell renders, with the tenant used by the app matching the token's tenant claim, without configuring anything else by hand.

**Acceptance Scenarios**:

1. **Given** a visitor completes login successfully at identity-service, **When** they are redirected back to the admin-frontend, **Then** the authenticated shell (layout + navigation) renders.
2. **Given** an authenticated session whose token carries tenant claim T, **When** the shell renders, **Then** the tenant context used by the app is T, regardless of any tenant value present in the URL, query string, or local storage.

---

### User Story 3 - Active session renews silently; logout fully ends it (Priority: P2)

While a user is active, their session renews without forcing a fresh login; when they choose to log out, both the local and identity-service sessions end.

**Why this priority**: Important for usability and correctness, but the shell is already meaningfully demonstrable from the P1 stories — this hardens the auth lifecycle rather than establishing it.

**Independent Test**: Stay active in the shell past the access token's expiry and confirm no forced re-login occurs; separately, trigger logout and confirm the next navigation redirects to the identity-service login.

**Acceptance Scenarios**:

1. **Given** an authenticated session nearing token expiry, **When** the user remains active in the app, **Then** the token is renewed silently and the user stays on their current screen.
2. **Given** an authenticated user, **When** they trigger logout, **Then** their local session is cleared and any subsequent navigation to an authenticated route redirects to the identity-service login.

---

### User Story 4 - Contributor can lint, format, type-check, and test the scaffold locally (Priority: P3)

A developer cloning the scaffold can run the standard quality commands (lint, format check, type-check, unit tests with a coverage gate) and they pass, and can run the app locally through the project's orchestrator.

**Why this priority**: Necessary for the codebase to stay maintainable going forward, but it doesn't block demonstrating the auth/shell behavior to a stakeholder, so it ranks below the user-facing stories.

**Independent Test**: On a clean checkout, run each quality command independently and confirm each completes with a pass (not a crash or missing-script error), then start the app via the orchestrator and confirm it serves on the expected port.

**Acceptance Scenarios**:

1. **Given** a clean checkout of the scaffold, **When** a contributor runs the lint, format, type-check, and unit test commands, **Then** each completes and reports a pass against the untouched scaffold.
2. **Given** a clean checkout, **When** a contributor starts the local orchestrator, **Then** the admin-frontend dev server becomes reachable on its designated port with no extra manual setup.

---

### Edge Cases

- What happens when identity-service is unreachable at login time? The visitor sees a failure state; no authenticated content is ever exposed.
- What happens when a token is renewed and the tenant claim's value changes? The app re-resolves the tenant context from the new token rather than keeping the stale value.
- What happens when a user manually edits the URL, query string, or local storage to inject a different tenant id? It has no effect on which tenant's context the app uses — the token claim always wins.
- What happens when silent renewal fails (e.g., the identity-service session itself has ended)? The user is treated as unauthenticated and sent back to login.
- What happens when a user opens the admin-frontend in a second tab while already logged in? The second tab recognizes the existing session rather than forcing a redundant login.
- What happens when the access token is well-formed but missing a tenant claim entirely? The session is treated as invalid (fail closed) rather than granting untenanted/global access.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST block rendering of any authenticated-area content unless the current session holds a valid, unexpired token issued by the identity-service.
- **FR-002**: The system MUST redirect a visitor to the identity-service's OIDC login whenever they attempt to reach an authenticated route without a valid session.
- **FR-003**: The system MUST complete the OIDC login round-trip and return the visitor to the admin-frontend after a successful login at the identity-service.
- **FR-004**: The system MUST render an authenticated shell (layout and basic navigation) immediately once a valid session is established, without requiring any additional user action.
- **FR-005**: The system MUST resolve the active tenant exclusively from the tenant claim present in the validated access token.
- **FR-006**: The system MUST ignore any tenant identifier originating from a query parameter, route parameter, request body, or client-side storage for authorization or data-scoping purposes, even when one is present.
- **FR-007**: The system MUST silently renew the session before the access token expires whenever the identity-service allows renewal, without interrupting the user's current screen.
- **FR-008**: The system MUST provide a way for an authenticated user to log out, ending both the local session and the identity-service session.
- **FR-009**: The system MUST treat a missing, invalid, expired, or renewal-failed token as unauthenticated and deny access to authenticated routes (fail closed).
- **FR-010**: The system MUST be startable through the project's local orchestrator such that the admin-frontend becomes reachable on its designated port without manual configuration steps beyond starting the orchestrator.
- **FR-011**: The codebase MUST provide linting, formatting, type-checking, and unit-testing commands that each run and report a pass against the unmodified scaffold.
- **FR-012**: The codebase MUST include an automated test coverage gate that runs as part of the test command, even if its passing threshold is minimal at this stage.
- **FR-013**: The initial scaffold MUST NOT expose any business-domain feature (e.g., Categories, Services, Clients); the authenticated shell's navigation is limited to structural/placeholder elements.

### Key Entities

- **Session**: The visitor's current authentication state — whether a valid, unexpired token exists, and when it needs renewal. Determines whether authenticated routes are reachable.
- **Tenant Context**: The organization scope resolved from the access token's tenant claim; used to identify the current tenant within the shell. Never derived from client-supplied input.
- **Authenticated User**: The principal identity returned by identity-service after login (e.g., a display name), shown minimally in the shell layout; profile management is not part of this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A person starting the local environment with the project's single orchestrator command can reach a running admin-frontend without any additional manual setup step.
- **SC-002**: 100% of attempts to open the admin-frontend without a valid session land on the identity-service login screen, with zero authenticated content ever visible first.
- **SC-003**: 100% of successful logins result in the authenticated shell rendering in the same session, showing the tenant that matches the token's tenant claim.
- **SC-004**: A user who remains active experiences zero forced re-logins caused by token expiry alone, until they either log out or their identity-service session itself ends.
- **SC-005**: 100% of the project's automated quality checks (lint, formatting, type-check, unit tests, coverage gate) complete and pass on a clean checkout with zero manual fix-up.
- **SC-006**: Verification finds zero cases where a client-supplied tenant value (URL, storage, parameters) changes which tenant's context the application displays or uses.

## Assumptions

- This feature builds the admin-frontend from a completely empty directory: no pre-existing application code, tooling configuration, or CI wiring for admin-frontend exists before this feature begins. Every requirement below describes creating something new, not adjusting or migrating an existing setup.
- Business-domain features (Categories, Services, Clients, etc.) are intentionally excluded from this scaffold; only the empty authenticated shell (layout + basic navigation) is delivered.
- The UI component library and any state/data-fetching library beyond the minimum needed to render the shell are deferred to planning, per the project constitution's "Explicitly Deferred Decisions."
- The generated OpenAPI client may be a minimal/stub client at this stage; generating a full client for every backend endpoint is out of scope.
- identity-service already exists, exposes a working OIDC endpoint, and is not modified by this feature.
- "Logout" ends the identity-service (OIDC) session, not just local application state, consistent with standard OIDC RP-initiated logout.
- The coverage gate's passing threshold starts minimal/trivial, as stated in the acceptance criteria, and is expected to rise in later features rather than being fixed by this one.
- The admin-frontend and identity-service run on the fixed local ports already set by the project constitution.
