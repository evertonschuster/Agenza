---
name: agenza-frontend-slice
description: Use when creating or changing a feature slice in apps/admin-frontend — scaffolding src/features/<slice>/ with model, api and ui, adding a page plus its hook, writing a loader/action or a repository, wiring a route in app/routes.tsx, or deciding whether new code belongs in a slice at all or in app/.
---

# Building a feature slice — admin-frontend

Read before you write: [`docs/ARCHITECTURE.md`](../../../apps/admin-frontend/docs/ARCHITECTURE.md)
§1 (shape and dependency direction), §2 (talking to the backend), §6 (what deliberately does not
exist yet). This skill is the workflow; the architecture doc is the truth.

`src/features/auth/` is the **only** slice today and is the worked example for the folder shape, the
barrel and the shell+hook split. It is *not* an example of the API path: no slice calls the backend
yet, on purpose ([ADR 0038](../../../docs/adr/0038-admin-frontend-remove-categories-harness.md)).

## 0. First decide it IS a slice

A slice has **`model/` AND `api/`** — a domain type with rules, and a repository that talks to the
backend. A screen with neither is not a slice: it goes in `src/app/`, exactly like the provisional
`src/app/HomePage.tsx` and the "Em breve" screens in
[`specs/002-ui-foundation/plan.md`](../../../apps/admin-frontend/specs/002-ui-foundation/plan.md) (D6).

Creating `features/<name>/ui/` with an empty `model/` beside it is the most common wrong first move —
it buys a barrel, an ESLint boundary and three folders to earn nothing.

When you *do* build the first real business route, **delete `src/app/HomePage.tsx`** instead of
shipping beside it. That retirement trigger is written down in ARCHITECTURE §6.

## 1. Scaffold

```
src/features/<slice>/
├── model/<entity>.ts             domain type + rules. No React, no wire types.
├── api/<entity>Repository.ts     thin typed delegation over servicesApi
├── ui/pages/<Page>/
│   ├── <Page>.tsx                shell
│   ├── use<Page>.ts              this page's own hook
│   └── route.ts                  loader / action
└── index.ts                      the slice's ONLY public surface
```

Folders and identifiers are English (`services`, `clientRepository`, `AppointmentList`); route paths
and every visible string are pt-BR (`/agenda`, "Nenhum cliente encontrado"). See
`agenza-ptbr-copy` before writing copy, dates, numbers or currency.

`entities/` and a top-level `pages/` layer **do not exist on purpose**. Create one when a *second*
slice needs the same entity — not in anticipation.

## 2. The barrel is the only door

`index.ts` re-exports pages, providers and each page's `loader`/`action`. Nothing outside the slice
may import `@/features/<slice>/ui/...`; ESLint bans the `@/features/*/*` pattern.

> **Flat-config trap.** In `eslint.config.js`, a later matching block **replaces**
> `no-restricted-imports` rather than merging it. That is why the `src/features/**` block restates
> the `@/features/*/*` barrel ban next to its `@/app/*` ban. Add a block, forget to restate, and the
> barrel silently stops being enforced for every file the new block matches. The config carries a
> comment saying so — keep it true.

Direction is `app → features → shared`, and inside a slice `ui → model | api`, `api → model`. A
domain type never lives in `api/`. `shared/` may import neither.

## 3. Route wiring

`loader` and `action` live in `ui/pages/<Page>/route.ts` and are re-exported by the barrel, so
`app/routes.tsx` imports `@/features/<slice>` and the direction stays `app → features`. Server data
reaches the shell through `useLoaderData()` / `useActionData()` / `useNavigation()` — never through
page-owned state. Nothing implements this yet; you are writing the first one. Shape and example in
[references/pages.md](references/pages.md).

## 4. Pages are shells

`<Page>.tsx` holds no `useState`, `useEffect` or `useRef` of its own. All of it lives in that page's
**own** hook. Hooks are never shared between pages — the single exception is a pure Context accessor
like `useAuth`. Two pages wanting the same logic means the logic is a pure function for `model/`, not
a shared hook. Details, sub-component placement and the StrictMode guards:
[references/pages.md](references/pages.md).

## 5. Repository and Result

The row everyone misreads: **`unwrapOrThrow` is used only at the `loader` / `queryFn` boundary. An
`action` or a mutation passes the `Result` straight through**, because a 400 with field errors is
expected flow returning to the form — not an error screen. `servicesApi` never rejects, a repository
does zero error handling, and a page has no `try/catch`. Never branch on a backend message string;
branch on `result.error.code`. Full shape, boundary table and testing:
[references/api-integration.md](references/api-integration.md).

## 6. UI, a11y, tests

- Primitives come from `shared/ui/` over Base UI, which uses a `render` prop —
  Radix's `asChild` + `Slot` snippets do not compile here
  ([ADR 0039](../../../docs/adr/0039-admin-frontend-base-ui-primitives.md)). Use
  `agenza-ui-primitive` before adding anything to `shared/ui/`.
- Semantic tokens only (`bg-background`, `text-muted-foreground`); every interactive control needs an
  accessible name; decorative icons get `aria-hidden`. Run `agenza-a11y-review` on a new screen.
- Tests are colocated, Vitest + RTL, module mocks via `vi.mock` / `vi.hoisted` — no network mocking.
  Coverage thresholds in `vitest.config.ts` are a real gate: `shared/ui/` and slice barrels are
  excluded, so your `model/`, `api/` and page hooks carry the number. See `agenza-testing`.
- Before pushing: `npm run lint`, `npx tsc --noEmit`, `npm run format`, `npm run test:coverage`, plus
  `npm run generate:api-types:check` if you touched an endpoint. Expect `exactOptionalPropertyTypes`
  friction on spread props (`X | undefined` must be explicit).
