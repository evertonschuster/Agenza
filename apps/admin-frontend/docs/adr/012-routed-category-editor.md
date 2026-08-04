# ADR 012 — Routed category editor

**Status:** Accepted for the interaction model. ADR 013 supersedes the original
outlet-context data-sharing mechanism.

## Decision

Categories uses three routes:

- `/categories` for the searchable list and delete flow;
- `/categories/new` for create mode; and
- `/categories/:id/edit` for edit mode.

The two child routes open one shared `CategoryEditorDialog` and form while the
list route remains mounted. Closing, successful submission, or browser back
returns to `/categories`. The route parameter selects create or edit behavior.

## Consequences

Creation and editing share one form and have addressable URLs without parallel
page implementations. List, editor, delete, navigation, responsive semantics,
and accessibility behavior remain covered by route-level tests. Data loading
for edit mode follows ADR 013; do not reintroduce the former outlet-context
contract.
