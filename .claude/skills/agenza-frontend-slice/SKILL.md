---
name: agenza-frontend-slice
description: Builds or changes an admin-frontend feature — its model, page hook, list, route dialog and route wiring (tela, página, lista, rota, feature do frontend). Use when deciding where frontend behavior belongs. Not for forms (agenza-form-field), repositories or contract (agenza-api-contract) or copy (agenza-ptbr-copy).
---

# Build a frontend feature

The [frontend architecture](../../../apps/admin-frontend/docs/ARCHITECTURE.md) owns placement and
layer rules; [layerBoundaries.js](../../../apps/admin-frontend/eslint-rules/layerBoundaries.js) enforces
them. Copy a live slice, not the nearest file:
[clients](../../../apps/admin-frontend/src/features/clients) for a business feature,
[tags](../../../apps/admin-frontend/src/features/tags) for route dialogs and creation from a selector,
[auth](../../../apps/admin-frontend/src/features/auth) for OIDC.

```text
- [ ] Owning slice found; extend it, or put a screen without domain behavior in app/
- [ ] Pure rules in model/, use cases in application/, lifecycle in the page hook, rendering in the page
- [ ] Repository and result handling per agenza-api-contract
- [ ] Route wired in routes.tsx and exported through the slice barrel
- [ ] Forms per agenza-form-field; copy per agenza-ptbr-copy; tests per agenza-testing
- [ ] Verification loop below passes
```

## Page and route

Start from the affected page: [useClientFormPage](../../../apps/admin-frontend/src/features/clients/ui/pages/ClientFormPage/useClientFormPage.ts)
shows a full-page lifecycle and
[useTagFormPage](../../../apps/admin-frontend/src/features/tags/ui/pages/TagFormPage/useTagFormPage.ts)
loading and saving inside a route dialog. Reuse a generic widget or shared hook where its
responsibility fits; a second caller alone does not justify coupling two page lifecycles.

In [routes.tsx](../../../apps/admin-frontend/src/app/routes.tsx), give the route a `handle` when it
needs a page header and keep the parent `<Outlet />` when a child dialog must leave the list mounted.
[useCloseRoute](../../../apps/admin-frontend/src/shared/hooks/useCloseRoute.ts) closes with a fallback
for direct navigation. Existing pages load through repositories; create `route.ts` only for a real
loader or action, never as scaffolding.

## Lists

Compare [useClientListPage](../../../apps/admin-frontend/src/features/clients/ui/pages/ClientListPage/useClientListPage.ts)
or [useTagListPage](../../../apps/admin-frontend/src/features/tags/ui/pages/TagListPage/useTagListPage.ts).
Filter types and initial query live in `model/`; state, requests and filters follow
[§1 of the architecture](../../../apps/admin-frontend/docs/ARCHITECTURE.md#1-shape). When a save or
deletion must refresh a mounted list, check the mutation topic and its subscribers.

## Pending work

A read effect owns an `AbortController`, forwards its signal and ignores an aborted answer. Tie loaded
data to the route id so an older record is never shown as ready for a new id. After a mutation, keep
the existing unmount guard: an answer that arrives after the person left must not redirect them back.
Use the loading and error state of the chosen mechanism, without a page-level exception wrapper.

## Verify

Exercise the changed behavior and its failure path, such as applying a filter, changing a page,
closing a direct-link dialog or leaving while a request is pending. From `apps/admin-frontend/`, run
`npm run lint`, `npm run build` and the affected tests, fix and repeat; finish with
`npm run test:coverage`. Report what ran and any unverified path. If the wire contract changed, use
[agenza-api-contract](../agenza-api-contract/SKILL.md). Tenant or session changes:
[agenza-tenant-isolation](../agenza-tenant-isolation/SKILL.md).
