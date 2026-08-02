# ADR 016 — Tags removed from the frontend; backend Tag API retained

**Status:** Accepted

## Decision

The entire Tags vertical is removed from `apps/admin-frontend`:

- Domain (`Tag` entity, `InvalidTagError`), application
  (`TagRepository`, its fake), infrastructure (`ApiTagRepository`,
  `tagMapper`), and presentation (`TagsPage`, `TagForm`, `TagsTable`,
  `TagEditorDialog`, `useTags`/`useTagEditor`/`useTagsPage`) are all
  deleted.
- The `/tags` route, the "Etiquetas" sidebar entry, the `catalog` facade's
  `*Tag` members, the `tagHandlers` MSW mocks, and the two Tags E2E specs
  (`tags-crud.spec.ts`, `tags-list-retry.spec.ts`) are all removed.
- `CategoriesListPage`/`CategoryEditorDialog` becomes this app's reference
  implementation for a CRUD list+form page, replacing the role `TagsPage`/
  `TagForm` played (see `AGENTS.md`'s Componentization and Design language
  sections).

**The backend `Tag` domain entity and `/api/v1/tags` endpoints are
intentionally kept, unchanged** — this is a frontend-only removal, an
explicit project-owner decision. `Service`'s backend-side many-to-many
relationship to `Tag` (the `ServiceTags` join table, `TagIds` on
create/update, the `tagId` list filter, `TagSummary` on `ServiceDto`) is
untouched. `docs/API.md` and `docs/DOMAIN.md` note this explicitly so a
reader doesn't conclude the backend contract changed to match.

## Rationale

An earlier attempt at this removal also started stripping `Tag` out of the
backend's `Service` aggregate (a real EF Core many-to-many relationship,
not just documentation) and was interrupted mid-way, leaving a commit with
a broken backend build. Given the choice of finishing that backend removal
or reverting it, the project owner chose to keep the backend Tag domain
model and API surface as-is and scope this change to the frontend only.
This avoids a backend schema migration, a rewrite of `Service`'s
relationship-loading/validation code, and a governance-script update
(`scripts/architecture_guard.py`'s `check_database_boundary_configuration`
hardcodes the `ServiceTags` EF configuration) for a UI feature that's
simply not needed right now.

## Consequences

- `apps/admin-frontend/AGENTS.md`, `docs/STATUS.md`, `docs/DOMAIN.md`,
  `docs/API.md`, `.agent.md`, `eslint.config.js`, and `.env.example` are
  updated to stop describing Tags as a built frontend feature, and to
  flag that the backend still returns `tags`/`tagIds` on `ServiceDto`
  even though the frontend has no `Tag` type to represent it.
- `agent-skills/agenza-frontend-feature` (canonical, synced to
  `.claude/skills/`/`.agents/skills/`) no longer uses `TagsPage`/`TagForm`
  as its worked example; it uses Categories instead.
- Historical ADRs (007–011, 014) that used Tags as a worked example when
  documenting an already-made decision are left as-is — they describe
  what was true at the time, not current reality.
- If Services' create/edit form is built later, it inherits a real
  backend `tags`/`tagIds` field with no frontend `Tag` type to back it -
  whoever builds that form needs to decide whether to reintroduce a
  minimal read-only tag type, call the backend's `/api/v1/tags` directly
  without a full vertical, or drop tag selection from the form. Not
  decided here.
- Backend test/build/governance gates are unaffected — no backend files
  changed as part of this ADR.
