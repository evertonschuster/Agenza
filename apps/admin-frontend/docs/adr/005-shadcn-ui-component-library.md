# ADR 005 — shadcn/ui as the component source

**Status:** Accepted

## Context

The frontend uses Tailwind and CSS-variable theming. A component suite with a
second styling engine would create two competing design systems, while building
accessible dialogs, menus, and focus behavior directly would add avoidable
risk.

## Decision

Use shadcn/ui as source code copied into `src/components/ui/`: Radix primitives
provide accessible behavior and Tailwind classes provide styling. Do not add an
opaque component-library runtime or a parallel CSS-in-JS system.

Generated components are repository code after import. Therefore:

- add only primitives required by an implemented flow;
- review generated output for this project's strict TypeScript settings;
- keep accessibility behavior from the underlying primitive;
- extend variants or props only for a demonstrated use case; and
- inspect the diff after any CLI regeneration, especially shared theme tokens
  and dependency changes.

## Consequences

The project owns and can adjust each component without waiting for a library
release, but also owns maintenance of those copies. The table primitive is
presentational rather than a data-grid abstraction. Current usage and design
conventions live in `apps/admin-frontend/AGENTS.md` and the frontend feature
skill rather than in this ADR.
