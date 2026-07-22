# Agent task template (tool-neutral)

Copy this into your prompt to whichever agent you're using (Claude Code,
OpenAI Codex, or any other agent that reads `AGENTS.md`) and fill in every
section. This template intentionally uses no tool-specific syntax (no
`/skill`, no `$skill`) — name the skills you want consulted in plain
language, as below, and the agent finds them itself.

---

## Objective

<One or two sentences: what should exist when this task is done, and why.>

## Scope

<Which apps/services/directories this touches. Call out anything
explicitly OUT of scope if it's likely to be assumed otherwise.>

## Business rules / spec

<Entities, fields, validation ranges, error cases, endpoint shapes —
whatever the agent needs so it doesn't have to guess. Ambiguity here
becomes invented behavior; see "Read these" below.>

## Acceptance criteria

<Concrete, checkable outcomes. Prefer a list of "given X, when Y, then
Z" statements over "it should work.">

## Read these first

- Root `AGENTS.md`
- `backend/AGENTS.md` and/or `apps/admin-frontend/AGENTS.md` (whichever
  area(s) this touches)
- Relevant ADRs under `docs/adr/` (name specific ones if you know them)

## Skills to use

<List the skills whose description matches this task, e.g.:>

- agenza-backend-use-case
- agenza-frontend-feature
- agenza-exception-flow-audit
- agenza-architecture-review
- agenza-rule-persistence
- agenza-api-contract-review
- agenza-tenant-isolation-review
- agenza-migration-safety

## Allowed files / directories

<If the task should stay confined to specific paths, say so explicitly.
Otherwise state "no restriction beyond the scope above.">

## Mandatory commands before calling this done

```bash
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
python scripts/architecture_guard.py

# plus whichever of these apply to what changed:
dotnet build backend/AdminBackend.slnx
dotnet test backend/AdminBackend.slnx
npm run format:check --workspace=apps/admin-frontend
npm run lint --workspace=apps/admin-frontend
npm run build --workspace=apps/admin-frontend
npm run test:coverage --workspace=apps/admin-frontend
```

## Restrictions

- Only ask a question when it could change a business rule, a public
  contract, auth/authorization, tenant isolation, existing production
  data, or a choice between two incompatible architectures — see the
  question policy in root `AGENTS.md`. Otherwise decide and proceed.
- Don't invent requirements not stated here or implied by existing
  code/ADRs.
- Don't delete tests, disable lint rules, shrink coverage gates, or widen
  allowlists to make a gate pass.
- If a correction or new rule surfaces mid-task, judge whether it's
  durable; if so, follow `agenza-rule-persistence` rather than leaving it
  only in this conversation.

## Report format

At the end, report:

1. What changed (files, one line each).
2. Which commands were run and their result (pass/fail, not just "should
   work").
3. Any question that blocked a piece of work, and why it met the
   question-policy bar.
4. Anything left undone or any known risk.
