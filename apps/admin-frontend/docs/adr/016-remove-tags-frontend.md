# ADR 016 — Remove Tags from the frontend

**Status:** Accepted

## Decision

Remove the Tags vertical, route, navigation entry, frontend types,
repositories, handlers, tests, and app-container facade members from
`apps/admin-frontend`.

Keep the backend `Tag` model, `/api/v1/tags` endpoints, and `Service`–`Tag`
relationship unchanged. This is a frontend product-scope decision, not an API
or database removal.

## Consequences

- Categories is the reference CRUD list/editor vertical for frontend work.
- Frontend domain and API documentation must state that the backend still
  exposes tag data even though no frontend Tag vertical exists.
- A future Service editor must make an explicit product decision about tag
  selection before introducing any minimal read model or restoring a vertical.
- Historical frontend ADR examples do not define current feature availability;
  `docs/STATUS.md` and code do.
