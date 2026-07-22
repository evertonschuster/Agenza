# Frontend feature template (tool-neutral)

For a new or changed page/form/hook in `apps/admin-frontend`. Fill in
every section; delete this instruction line before sending.

---

## Objective

<E.g. "Build the Clients list + create/edit page.">

## Scope

- Feature folder(s): `domain/entities/`, `application/use-cases/`,
  `infrastructure/repositories/`, `presentation/{hooks,forms,pages}/`
- Stub page being replaced (if any): `<PageName>`

## API spec (search before asking — see root `AGENTS.md`'s question policy)

Before asking the user for any of this, check
`src/infrastructure/generated/services-api.d.ts`, the backend controller/
DTOs under `backend/services/services-service/`, `docs/API.md`, and
`docs/adr/` — only ask what's still genuinely missing after that search.

- Base path: `<...>`
- Methods + shapes (request/response) per operation: `<...>`
- Error codes/shapes: `<...>`
- Tenant scoping mechanism (JWT claim / header / path / query): `<...>`

## Business rules / field constraints

<Field name, type, required?, min/max length or range, matching backend
Domain constant if known — this must match the backend exactly; if
unsure, use `agenza-api-contract-review` to check instead of guessing.>

## Acceptance criteria

- [ ] Domain entity + use case tests (fakes)
- [ ] Mapper tests (all fields + failure paths)
- [ ] Infrastructure repository tests (MSW)
- [ ] Hook test (fake container), tenant-scoped via `resetKey`
- [ ] Page: loading/error/success states, dark mode, 375px width, keyboard
      operable, pt-BR text
- [ ] Form (if any): React Hook Form + Zod, server errors mapped to fields

## Read these first

- `apps/admin-frontend/AGENTS.md`
- `docs/STATUS.md`, `docs/DOMAIN.md`, `docs/API.md`

## Skills to use

- agenza-frontend-feature (primary)
- `apps/admin-frontend/.skills/admin-api-contract/SKILL.md` (translating
  the API spec above into DTOs/mappers/MSW handlers)
- `apps/admin-frontend/.skills/admin-tdd-conventions/SKILL.md` (test
  patterns, TS-strict test gotchas)
- agenza-api-contract-review (if anything about the API spec above is
  uncertain against the real backend)

## Allowed files / directories

`apps/admin-frontend/src/**` for the feature in scope, plus
`apps/admin-frontend/src/test/mocks/handlers/` for MSW handlers.

## Mandatory commands

```bash
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
npm run format:check --workspace=apps/admin-frontend
npm run lint --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend
npm run test:coverage --workspace=apps/admin-frontend
python scripts/architecture_guard.py
```

## Restrictions

- No `any`, anywhere, including tests and fakes.
- No cross-feature import (a page importing another page's `domain/`/
  `application/`/`infrastructure/`).
- No raw Tailwind palette classes (`slate-*`, `teal-*`, etc.) — semantic
  tokens only.
- No new global client-state store (Redux/Zustand) used as a server cache.
- No Formik/Yup without an explicit ADR.
- No hand-duplicated DTO for something already in
  `src/infrastructure/generated/services-api.d.ts`.

## Report format

Same as `agent-task-template.md`'s report format, plus: screenshots or a
description of the page in both light/dark mode if a UI change was made
and a browser preview was available.
