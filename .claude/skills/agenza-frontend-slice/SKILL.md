---
name: agenza-frontend-slice
description: Build or change an admin-frontend feature, including its model, repository, page hook and route wiring. Use when deciding where feature behavior belongs or extending an existing slice.
---

# Build a frontend feature

Use the [frontend architecture](../../../apps/admin-frontend/docs/ARCHITECTURE.md) for the applicable
rule, then inspect the code being changed. Read only the references needed for the task:

- Page, list, dialog or route: [references/pages.md](references/pages.md).
- Repository or API result consumption: [references/api-integration.md](references/api-integration.md).

## Place the behavior

1. Identify the owning slice and its public `index.ts`. Extend that slice when it owns the behavior.
   A provisional screen without domain behavior belongs in `app/`; do not create empty segments.
2. Consult [Shape](../../../apps/admin-frontend/docs/ARCHITECTURE.md#1-shape) when a dependency crosses
   a boundary. Import another slice through its barrel. The executable checks are in
   [layerBoundaries.js](../../../apps/admin-frontend/eslint-rules/layerBoundaries.js).
3. Compare a relevant live implementation rather than copying the nearest file indiscriminately:
   [clients](../../../apps/admin-frontend/src/features/clients) for a business feature,
   [tags](../../../apps/admin-frontend/src/features/tags) for route dialogs, or
   [auth](../../../apps/admin-frontend/src/features/auth) for OIDC integration.
4. Keep page lifecycle in its page hook and pure domain rules in `model/`. Reuse an existing generic
   widget or shared hook where its responsibility fits; a second caller alone does not justify
   coupling two page lifecycles.

## Implement the affected path

Follow the page or repository reference above. Route composition belongs in
[routes.tsx](../../../apps/admin-frontend/src/app/routes.tsx); expose feature components through
the barrel. Create `route.ts` only when implementing a loader or action, not as empty scaffolding.

For conditional work, open the corresponding procedure:

- Forms and server validation: [agenza-form-field](../agenza-form-field/SKILL.md).
- Primitives, semantic tokens and keyboard behavior: [agenza-ui-primitive](../agenza-ui-primitive/SKILL.md).
- Visible copy and formatting: [agenza-ptbr-copy](../agenza-ptbr-copy/SKILL.md).
- Tenant/session changes: [agenza-tenant-isolation](../agenza-tenant-isolation/SKILL.md).
- Test selection and coverage: [agenza-testing](../agenza-testing/SKILL.md).

## Verify

Exercise the behavior and failure path that changed. Select the relevant checks from
[package.json](../../../apps/admin-frontend/package.json) and the
[frontend CI](../../../.github/workflows/frontend-ci.yml). Report what ran and any unverified path.
If the wire contract changed, follow the regeneration procedure in
[agenza-api-contract](../agenza-api-contract/SKILL.md).
