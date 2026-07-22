# Backend feature template (tool-neutral)

For a new or changed command/query/endpoint in `backend/`. Fill in every
section; delete this instruction line before sending.

---

## Objective

<E.g. "Add a Rename operation for Categories in services-service.">

## Scope

- Service: `<identity-service | services-service | new: name>`
- Feature: `Application/<Feature>/`
- New service? Only if this is a genuinely new bounded context — see
  `.skills/backend-new-microservice/SKILL.md` before assuming yes.

## Business rules / spec

- Command/query shape: `<fields, types>`
- Validation (shape only — required/length/format/range/cross-field):
  `<...>`
- Cross-aggregate rules (existence/uniqueness/in-use — these live in the
  handler, not the validator): `<...>`
- Auth: `<[Authorize] default, scope(s) if M2M-only, [IgnoreTenant] only if genuinely tenant-free>`
- Error cases and their `Error.*` type (Validation/NotFound/Conflict/Forbidden): `<...>`

## Acceptance criteria

- [ ] Unit tests for the handler cover: happy path, not-found (if
      applicable), conflict/duplicate (if applicable), domain validation
      failure
- [ ] Validator test(s) cover shape rules only
- [ ] Manually verified: unauthenticated → 401, wrong scope/tenant → 403,
      validation failure → 400, happy path → expected status + persisted
      effect

## Read these first

- `backend/AGENTS.md`
- `docs/adr/0005`, `docs/adr/0007`, `docs/adr/0012`, `docs/adr/0014`
  (CQRS/vertical-slice, command-binding, Result-pattern rationale)

## Skills to use

- agenza-backend-use-case (primary — build order, decision tree, hard
  prohibitions, copy-paste templates)
- agenza-exception-flow-audit (if this touches any existing throw/try/catch)
- agenza-tenant-isolation-review (if this adds a new tenant-owned entity
  or query)
- agenza-migration-safety (if this needs an EF Core migration)

## Allowed files / directories

`backend/services/<service>/**` (all five layers as needed), plus
`docs/adr/` if a new ADR is warranted.

## Mandatory commands

```bash
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx
python scripts/architecture_guard.py
```

## Restrictions

- No repository dependency in a validator constructor; no `MustAsync`/
  `CustomAsync`.
- No `throw` for an expected outcome (validation, not-found, conflict,
  in-use, forbidden) — `Result`/`DomainResult`/`PersistenceResult` only.
- No `DuplicateEntityException`, no `BusinessExceptionHandler`.
- No null-forgiving `!` on a repository lookup assuming a validator
  guaranteed existence — fetch and null-check in the handler itself.

## Report format

Same as `agent-task-template.md`'s report format, plus: which `Error.*`
type each new failure path returns, and whether a migration was added
(and if so, whether `agenza-migration-safety`'s checklist was followed).
