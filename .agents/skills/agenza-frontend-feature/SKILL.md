---
name: agenza-frontend-feature
description: >
  Use whenever changing React or TypeScript under apps/admin-frontend,
  including pages, hooks, forms, domain models, repositories, generated
  contracts, tests, auth, or shared UI. Routes the task to the minimum
  required frontend references and enforces this repository's Result-based,
  feature-oriented architecture. Read it before implementation because its
  conventions intentionally differ from generic React tutorials.
---

# Frontend feature

Start with the code that owns the current behavior. `AGENTS.md` contains
invariants; `docs/STATUS.md` contains progress; ADRs contain rationale. Never
infer the current tree from an old example in prose.

## Load only what the task needs

| If the task touches... | Also read |
| --- | --- |
| Repository, mapper, decoder, OpenAPI type, MSW API handler | [references/api-integration.md](references/api-integration.md) |
| Test file, fake, wrapper, MSW setup | [references/testing.md](references/testing.md) |
| Page, form, dialog, table, shared component, visual behavior | [references/page-ui-conventions.md](references/page-ui-conventions.md) |
| Auth/session behavior | frontend ADRs 004, 006, 007 and 015 via `docs/adr/README.md` |
| Moving feature boundaries or public APIs | frontend ADR 009 and the current ESLint rules |

Do not open all three references for a narrow change.

## Current architectural shape

- `src/app/`: bootstrap, routing, layouts, providers, composition.
- `src/features/<feature>/`: domain, application, infrastructure, and
  presentation owned by one business capability.
- `src/shared/`: cross-feature primitives that already have at least two
  identical consumers or are genuine application-wide boundaries.
- `src/components/ui/` and `src/lib/utils.ts`: shadcn-generated locations;
  they intentionally stay outside `shared/`.
- Unimplemented routes remain small placeholders in `src/app/pages/` until a
  real feature slice exists.

Catalog currently implements Categories. Services is a placeholder and Tags
is intentionally absent from the frontend; check `docs/STATUS.md` instead of
assuming either vertical exists.

## Decision rules

### Domain and Result flow

- Domain factories validate invariants and return `Result<Entity, DomainError>`.
  They do not throw for expected invalid input.
- API mappers compose domain results. A malformed external response becomes a
  curated `AppError` at the infrastructure boundary.
- `useAsync` consumes `() => Promise<Result<T, E>>`. Expected failures never
  become rejected promises merely to fit a hook.
- Validate runtime input even when a generated TypeScript type looks narrower;
  wire data is untrusted.

### Application boundary

- A repository port returns domain values wrapped in `Result`; it never exposes
  raw DTOs.
- Repository methods do not accept tenant context. Tenant selection belongs to
  the authenticated request-session boundary.
- Add a use-case class when it performs orchestration, policy, or composition.
  If a facade operation is a pure repository pass-through, expose the method
  shape directly as Catalog does today.
- Construct concrete implementations only in `app/composition/container.ts`
  and expose grouped facades, never raw repositories or `HttpClient`.

### Feature boundaries

- Import another feature only through its `index.ts` public API.
- Keep feature-specific DTOs, forms, hooks, view models, and tests inside that
  feature. Promote a genuinely identical cross-feature primitive to `shared/`
  only when the second use exists.
- Do not create `GenericCrudPage` or another config-driven entity-agnostic UI.

### Tenant and auth safety

- `AuthenticatedHttpClient` reads one `GetRequestSession` snapshot and attaches
  the bearer token plus `X-Tenant-Id`; individual repositories do not choose a
  tenant.
- Pass the authenticated tenant id as `useAsync.resetKey` so previous-tenant
  data cannot paint after a switch.
- Preserve both user and tenant identity during silent renewal. A changed claim
  requires a full login.
- Keep routed tenant content below `TenantBoundary`.

## Implementation sequence

Use only the steps relevant to the requested behavior:

1. Confirm the business rule or wire contract from code/OpenAPI/docs; ask only
   when a missing answer would change a public contract, auth, tenant isolation,
   or business behavior.
2. Add or change the domain behavior with a failing test when domain logic is
   involved.
3. Change the port and orchestration boundary only if the behavior requires it.
4. Change decoder/mapper/repository and MSW tests for external data.
5. Wire the facade/container without leaking concrete infrastructure.
6. Build the hook with `useAsync` and a tenant reset key when it owns server data.
7. Build the smallest accessible page/form composition needed now.
8. Update `docs/STATUS.md` only when implementation status changed; update an
   ADR only when a durable decision changed.

## Prohibited

- `any`, deep cross-feature imports, raw infrastructure imports from
  presentation, hand-duplicated generated contracts, or a second design system.
- A global client-state library used as a server cache without an ADR replacing
  the established `useAsync` approach.
- Raw backend/exception messages rendered to users.
- Speculative components, variants, use cases, or abstractions.

## Completion

Run the frontend and governance gates from `apps/admin-frontend/AGENTS.md`.
Report actual results and any remaining uncertainty; do not call the task done
while an applicable gate is red.
