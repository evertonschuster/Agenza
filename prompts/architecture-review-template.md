# Architecture review template (tool-neutral)

For an audit request — periodic, pre-release, or triggered by a specific
concern. Fill in every section; delete this instruction line before
sending.

---

## Objective

<E.g. "Confirm tenant isolation holds for the new Appointments vertical
before it ships.">

## Scope

<Which areas: whole monorepo, one service, one app, one specific
concern (exceptions / contracts / tenancy / migrations).>

## Mode

- [ ] Review only — report findings, do not edit code
- [ ] Review + implement — diagnose, fix, validate, report evidence

## Read these first

- Root `AGENTS.md` and the `AGENTS.md` for each area in scope
- `docs/adr/` for anything the review might touch

## Skills to use

<Pick based on scope — don't run every skill on every review:>

- agenza-architecture-review (general sweep / orchestrates the rest)
- agenza-exception-flow-audit (backend error handling)
- agenza-tenant-isolation-review (multi-tenancy)
- agenza-api-contract-review (backend/frontend contract drift)
- agenza-migration-safety (if a migration is in scope)

## Mandatory commands

Review-only mode runs these — they're all read-only:

```bash
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
python scripts/architecture_guard.py --inventory
```

Implement mode additionally must end with the blocking (non-`--inventory`)
guard passing, same as any other change:

```bash
python scripts/architecture_guard.py
```

## Restrictions

- Review-only mode never edits code, even for an "obvious" one-line fix —
  report it instead.
- Implement mode never silently widens an allowlist, deletes a test, or
  lowers a coverage gate to make a finding go away.
- Any confirmed cross-tenant data exposure is reported first, regardless
  of what else is in scope.
- A finding that would change a public contract is reported for a
  decision, not fixed silently.

## Report format

- Findings table (file/location, what's wrong, why it matters — cite the
  rule/ADR/skill, severity, suggested fix), most severe first.
- If in implement mode: what was fixed, commands run and their result,
  anything left as a finding-only (with justification).
- Whether any finding is a durable rule worth persisting via
  `agenza-rule-persistence` rather than a one-off.
