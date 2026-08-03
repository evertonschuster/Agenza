# Frontend feature template

## Outcome

<What usable behavior should exist when this task is complete?>

## Scope

- Feature/capability: `<...>`
- Existing route or placeholder: `<...>`
- Explicitly out of scope: `<...>`

## Contract and business rules

Before asking, inspect generated OpenAPI types, backend controllers/DTOs, tests,
`docs/API.md`, and the ADR index.

- Endpoints and methods: `<...>`
- Request/response/error shapes: `<...>`
- Field constraints and invariants: `<...>`
- Auth/tenant behavior: `<normally the established bearer + X-Tenant-Id boundary>`

## Acceptance criteria

- [ ] Expected failures use `Result` values and curated UI errors
- [ ] Server data clears synchronously on tenant switch
- [ ] Mapper/repository/hook/UI tests match the affected boundaries
- [ ] Page/form is keyboard accessible, pt-BR, theme-safe, and works at 375 px
- [ ] Current feature status is updated if the placeholder state changed

## Read/use

- `apps/admin-frontend/AGENTS.md`
- `agent-skills/agenza-frontend-feature`
- `agenza-api-contract-review` only when contract drift is in scope
- Only the conditional API/testing/UI reference routed by the frontend skill

## Restrictions

No `any`, deep cross-feature imports, raw infrastructure imports from
presentation, hand-duplicated generated DTOs, raw palette colors, speculative
global state, or generic CRUD page abstractions.

## Required evidence

Report changed behavior, tests added/updated, documentation changes, and actual
results of every frontend and governance gate.
