# Implementation Plan: Service Tags CRUD

**Branch**: `003-tags-crud` | **Date**: 2026-09-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-tags-crud/spec.md`

## Summary

Add the first real data-driven feature slice to `admin-frontend`: a catalog screen at `/tags`
(`src/features/tags/`) for listing, creating, editing and deleting the `Tag` entity that
`services-service` already exposes at `/api/v1/tags` — the generated OpenAPI client
(`src/shared/api/generated/services-api.d.ts`) already contains the full contract (`TagResponse`,
`CreateTagCommand`, `UpdateTagCommand`), so this is purely additive frontend work with no backend or
contract change. The screen is reached only through the command palette (FR-014/FR-015; not nested
under Serviços, no new sidebar/bottom-nav icon), and is this codebase's first real exercise of the
`loader`/`action`-per-route pattern that `AGENTS.md` prescribes but no existing page has used yet —
`features/auth`'s pages predate data loading and use plain effects instead. The approved,
user-corrected clicked-through prototype
(https://claude.ai/code/artifact/b7bc520f-3e32-4c2d-9692-734e88a7452f) is the visual reference (spec
Assumptions).

## Technical Context

**Language/Version**: TypeScript ~6.0.3, strict mode (root `tsconfig`, constitution Principle I).
React 19.2.7.

**Primary Dependencies**: `react-router` ^8.3.0 (data router — `createBrowserRouter`, route-level
`lazy`/`loader`/`action`, already wired in `src/app/routes.tsx`); `openapi-fetch` ^0.17.0 +
`openapi-typescript` ^7.13.0 generated client (`servicesApi`, already covers the `/tags` endpoints —
no `npm run generate:api-types` regeneration needed, only the existing `:check` drift gate);
`@base-ui/react` ^1.8.0 via the existing shadcn-CLI-owned primitives in `src/shared/ui/`
(`dialog`, `button`, `input`, `textarea`, `card`, `kbd`) — no new UI library. One likely new
`shared/ui` primitive: a small fixed-option color-swatch picker (research.md Decision 4) — build it
through the `agenza-ui-primitive` skill, not ad hoc.

**Storage**: N/A — no new client-side persistence; the tag list is server state fetched per
navigation through a route `loader` (research.md Decision 2), consistent with the constitution's
still-deferred "state/data-fetching approach" (no server-state library introduced here either).

**Testing**: Vitest + React Testing Library for the hook/page/component split (`agenza-testing`
skill); Playwright for a new `e2e/tags.spec.ts` against the real Aspire stack (constitution
Principle V — no mocks), covering the CRUD happy path plus the duplicate-name and tag-in-use
conflicts from spec FR-004/FR-008.

**Target Platform**: Browser SPA, served by Vite via Aspire at the fixed port 5173 (constitution
Principle III) — no new target.

**Project Type**: Single frontend application inside the existing monorepo; this plan concerns only
`apps/admin-frontend`.

**Performance Goals**: Spec's own Success Criteria (SC-001 create <30s, SC-004 locate among 50 in
<5s) — both satisfied by loading the full (unpaginated, per spec Assumptions) list once and filtering
client-side; no separate performance target.

**Constraints**: FSD dependency direction (`app → features → shared`), mechanically enforced by
`eslint.config.js`'s `no-restricted-imports` blocks (constitution + `AGENTS.md`); all backend calls
through `servicesApi` only, no hand-written `fetch`/DTOs (Principle IV); tenant never read from
route/component state, only from the session the existing `apiClient` middleware already resolves
(Principle II) — this feature adds no new tenant-handling code; error display follows the
[[feedback-show-backend-error-messages-verbatim]] rule confirmed this session (spec FR-012): show
`ApiProblem.title` / per-field `errors[field][].message` verbatim, branch UI placement on the
`errors` dict's keys, never on message text.

**Scale/Scope**: One feature slice (`src/features/tags/`), one route (`/tags`), no pagination (small
catalog per spec Assumptions).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Strict TypeScript | PASS | No `any`; the hand-written `Tag` domain type mirrors the generated `TagResponse` structurally (data-model.md). |
| II. Multi-Tenant Safety Enforced Server-Side | PASS | Zero new tenant-handling code — every call goes through the existing `servicesApi` facade, whose `apiClient` middleware already attaches `X-Tenant-Id` from the validated session. No tenant id in the `/tags` route, in a form field, or in any cache key. |
| III. Authentication via identity-service (Fixed Ports) | PASS | Unaffected — no auth flow changes. |
| IV. Generated OpenAPI Client Only | PASS | Uses only `servicesApi.get/post/put/del` against the already-generated `paths['/api/v{version}/tags']` / `paths['/api/v{version}/tags/{id}']` types. `generate:api-types:check` runs as a Setup task to confirm no drift; no hand DTOs. |
| V. CI Quality Gates Are Non-Negotiable From Scaffold | PASS | No new gate — existing `tsc`/ESLint/Prettier/Vitest-coverage/Playwright/`generate:api-types:check` all apply as-is. New coverage is added under them (`e2e/tags.spec.ts`, unit/component tests for the new slice). |
| VI. No Frontend Docker | PASS | Unaffected. |

No violations. Complexity Tracking is not needed.

*Re-checked post-Phase 1: `data-model.md` (one entity, no new tenant/storage concern) and
`contracts/routes-contract.md` (one route, reusing the existing `apiClient`/`servicesApi`/error
pipeline end to end) introduce nothing beyond what this table already covers. Still all PASS.*

## Project Structure

### Documentation (this feature)

```text
specs/003-tags-crud/
├── plan.md                    # This file (/speckit-plan command output)
├── research.md                # Phase 0 output (/speckit-plan command)
├── data-model.md              # Phase 1 output (/speckit-plan command)
├── quickstart.md              # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── routes-contract.md     # Phase 1 output (/speckit-plan command)
├── checklists/requirements.md
└── tasks.md                   # Phase 2 output (/speckit-tasks command — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/admin-frontend/src/
├── features/
│   └── tags/                              # NEW — first data-driven feature slice
│       ├── model/
│       │   ├── tag.ts                     # Tag domain type + the 8-entry color palette (name+hex)
│       │   └── tagForm.ts                 # Client-side field validation mirroring spec FR-003/005
│       │                                  # (length, required) — NOT the source of truth; the
│       │                                  # backend's response is (FR-012), this only avoids a
│       │                                  # pointless round-trip for empty/too-long input.
│       ├── api/
│       │   └── tagsRepository.ts          # Thin typed delegation to servicesApi (list/create/update/remove)
│       ├── ui/
│       │   └── pages/
│       │       └── TagsPage/
│       │           ├── TagsPage.tsx       # Shell only — no useState/useEffect/useRef (AGENTS.md)
│       │           ├── useTagsPage.ts     # Search filter, dialog state, submission — all logic
│       │           ├── TagRow.tsx         # One list row (chip + description + row actions)
│       │           ├── TagFormDialog.tsx  # Create/edit dialog (name, color swatches, description)
│       │           ├── DeleteTagDialog.tsx# Confirm → blocked-if-in-use dialog
│       │           └── route.ts           # tagsLoader + tagsAction (React Router data APIs)
│       └── index.ts                       # Barrel — TagsPage + route.ts re-exports only
├── shared/
│   └── ui/
│       └── color-swatch-picker.tsx        # NEW generic primitive (build via `agenza-ui-primitive`) —
│                                          # fixed {value,label}[] options, radio-group semantics;
│                                          # takes no Tag-specific knowledge
├── app/
│   ├── routes.tsx                         # + one lazy route: path 'tags' → features/tags
│   └── shell/
│       └── CommandPalette.tsx             # + one "Etiquetas" entry, kept OUT of NAV_DESTINATIONS
│                                          # (navigation.ts unchanged — still exactly 6 destinations)
└── app/globals.css                        # unchanged — reuses the existing `.tag` chip class
```

Unit/component tests are colocated next to the source they cover (`TagsPage.test.tsx`,
`useTagsPage.test.ts`, `tagsRepository.test.ts`, …), matching every existing slice. The Playwright
spec is new: `e2e/tags.spec.ts`.

**Structure Decision**: Standard FSD slice per `AGENTS.md` — `model` (no React), `api` (the
repository), `ui/pages/TagsPage` (the page + its one hook + subcomponents + `route.ts`), `index.ts`
as the only public surface. Two things intentionally touch shared code outside the slice: a new
`shared/ui/color-swatch-picker.tsx` (generic, business-free — the 8 actual hex values stay in the
feature's `model/tag.ts`) and one new entry in `CommandPalette.tsx` (kept structurally separate from
`NAV_DESTINATIONS`, per FR-014, so the fixed 6-item primary nav is untouched). No `pages/` top-level
or `entities/` directory — still just one feature needing them (`AGENTS.md`).
