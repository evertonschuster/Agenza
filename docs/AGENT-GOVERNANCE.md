# AI agent governance

How this repository keeps every AI coding agent — Claude Code, OpenAI
Codex, or anything else that reads `AGENTS.md` — working from the same
architectural rules, the same skills, and the same completion criteria,
whether it's running locally or in CI, on Windows, Linux, or macOS.

## Why this exists

This codebase has already made, tried, and in a few cases reverted real
architectural decisions (see docs/adr/0010 → docs/adr/0012, and
docs/adr/0005/0006/0012 → docs/adr/0014). An agent that only reads a stale
skill or an out-of-date `CLAUDE.md` can reintroduce a bug that was already
found and fixed — this happened for real in this repo: `backend/.skills/backend-use-case/SKILL.md`'s
copy-paste templates kept teaching a `MustAsync`-validator-with-a-repository
pattern for over a cycle after docs/adr/0012 reverted it, because the
prose above the templates was updated and the templates weren't. This
framework exists to make that class of drift structurally harder, and to
make sure it isn't every tool's problem to solve separately.

## Architecture

```
agent-skills/                      <- the ONLY editable skill source
   ├── sync (content-hash) → .agents/skills/    (OpenAI Codex)
   └── sync (content-hash) → .claude/skills/    (Claude Code)

AGENTS.md (root, backend/, apps/admin-frontend/)  <- canonical, durable rules
   └── imported by CLAUDE.md (root, backend/, apps/admin-frontend/) via `@AGENTS.md`

guards (all three run the same checks, nothing is agent-specific)
   ├── Claude Code Stop hook  → scripts/claude_stop_guard.py
   ├── Codex / any agent      → the "Mandatory commands" section of AGENTS.md
   └── CI                     → .github/workflows/agent-governance.yml
```

### `AGENTS.md` is the canonical instruction source

Root `AGENTS.md` holds only rules that are durable and apply everywhere:
the question policy, the repo-wide non-negotiables (tenant scoping, Clean
Architecture, no shared mutable state, the exception policy), testing/
documentation/rule-persistence policy, mandatory commands, and completion
criteria. It deliberately stays short — area-specific detail lives in
`backend/AGENTS.md` and `apps/admin-frontend/AGENTS.md`, which are read
second, only by an agent actually working in that area.

### `CLAUDE.md` imports it, never restates it

Every `CLAUDE.md` in this repo (root, `backend/`, `apps/admin-frontend/`)
is a thin file: a `@AGENTS.md` import line plus, at the root only, Claude
Code-specific integration notes (which skills/subagents to prefer, which
governance commands to run before finishing a turn). None of them repeat
canonical rules — if you find yourself wanting to add a rule to a
`CLAUDE.md`, it almost certainly belongs in the matching `AGENTS.md`
instead, so Codex (and any future tool) gets it too.

### `agent-skills/` is the single editable skill source

Every skill lives once, at `agent-skills/<name>/SKILL.md`, with portable
frontmatter (`name` + `description` only — no `allowed-tools`, `context`,
`agent`, `hooks`, or model-specific fields). `scripts/sync_agent_skills.py`
copies it, verbatim, into `.agents/skills/<name>/` (where Codex looks) and
`.claude/skills/<name>/` (where Claude Code looks). **Never hand-edit
either distribution directory** — edit `agent-skills/`, then run the sync
script; a hand-edit in a distribution directory is exactly the "divergent
copy" `scripts/check_agent_governance.py` is designed to catch.

Three skills predate this framework and still live outside `agent-skills/`
on purpose, because they don't duplicate one of the eight canonical
skills: `backend/.skills/backend-new-microservice/SKILL.md` and
`apps/admin-frontend/.skills/admin-api-contract`/`admin-tdd-conventions`.
They're referenced directly from `backend/AGENTS.md`/
`apps/admin-frontend/AGENTS.md`. Two others — `backend/.skills/backend-use-case`
and `apps/admin-frontend/.skills/admin-feature-vertical` — were true
duplicates of canonical skills and are now redirect stubs pointing at
`agent-skills/agenza-backend-use-case` and `agent-skills/agenza-frontend-feature`
respectively.

## The eight canonical skills

| Skill | Purpose |
| --- | --- |
| `agenza-backend-use-case` | Build/change a .NET command, query, entity, or endpoint |
| `agenza-frontend-feature` | Build/change a React feature vertical |
| `agenza-exception-flow-audit` | Classify every throw/try/catch in `backend/` against docs/adr/0012/0014 |
| `agenza-architecture-review` | General architecture audit across the monorepo |
| `agenza-rule-persistence` | Turn a one-off correction into a durable, cross-file rule |
| `agenza-api-contract-review` | Audit backend/frontend contract drift |
| `agenza-tenant-isolation-review` | Audit multi-tenancy end to end |
| `agenza-migration-safety` | Audit/author an EF Core migration safely |

## Guards and how they compose

Three scripts, each usable standalone and by everything else:

- **`scripts/sync_agent_skills.py`** — `--check` verifies `.agents/skills/`
  and `.claude/skills/` are byte-identical (by content hash, not mtime) to
  `agent-skills/`; without `--check` it makes them so. No symlinks (works
  identically on Windows/Linux/macOS and in a CI checkout).
- **`scripts/check_agent_governance.py`** — verifies the governance
  *meta-files* are internally consistent: `AGENTS.md`/`CLAUDE.md` present
  and importing correctly, skill frontmatter valid and portable, skills
  in sync, no `.codex/skills` distribution directory, every `docs/adr/NNNN`
  and `scripts/*.py` reference in a governance file actually resolving,
  every documented `npm run` command actually existing in
  `apps/admin-frontend/package.json`.
- **`scripts/architecture_guard.py`** — scans actual application source
  (backend C#, frontend TS/TSX) plus the fenced code blocks inside every
  Markdown instruction/skill file for the specific reverted patterns this
  repo has already hit once: `DuplicateEntityException`,
  `BusinessExceptionHandler`, `ValidateAndThrow`, a repository dependency
  or `MustAsync`/`CustomAsync` rule in a validator, a domain entity
  throwing instead of returning `DomainResult`, `any` in frontend source,
  a cross-feature-page import, and a coverage-exclude entry outside the
  small documented allowlist. `--inventory` lists every finding
  (including informational, non-blocking ones) without failing; the
  default mode fails only on blocking findings. The allowlist for
  exceptions to these checks is intentionally tiny and lives at the top of
  the script itself, one entry per reviewed exception.

Wired into three places, all running the same logic:

- **Claude Code Stop hook** (`.claude/settings.json` → `scripts/claude_stop_guard.py`):
  runs the three scripts above, in order, stopping at the first stage with
  problems. Blocks the turn from ending (exit code 2) with the failures
  fed back to Claude. Reads `stop_hook_active` from its stdin payload and
  unconditionally allows the turn to end on any retry, so a governance
  problem an agent can't resolve alone can never hang the session —
  Claude Code's own ~8-attempt block cap is a second, independent safety
  net on top of that.
- **Any other agent (Codex included)**: the "Mandatory commands" section
  of `AGENTS.md` documents the same three commands directly — no
  tool-specific hook mechanism needed, since Codex has none of its own to
  wire this into.
- **CI** (`.github/workflows/agent-governance.yml`): runs the same three
  commands on every PR/push, independent of whether any agent tool is
  installed at all. This is the backstop that doesn't trust any agent's
  local hook to have actually run.

## How to create a new skill

1. `mkdir agent-skills/<name>` and write `agent-skills/<name>/SKILL.md`
   with portable frontmatter (`name` matching the directory, a specific
   `description` naming concrete trigger phrases).
2. Run `python scripts/sync_agent_skills.py` to distribute it.
3. Run `python scripts/check_agent_governance.py` to verify the
   frontmatter and sync are both valid.
4. Reference it from the relevant `AGENTS.md`'s skill table and, if it
   should be a first-class Claude Code reviewer, add a
   `.claude/agents/*.md` subagent that points at it (see the four
   existing ones for the pattern — they consult the shared skill, they
   don't restate it).

## How to update a rule

Don't just fix the code. Follow `agenza-rule-persistence`'s cycle: fix the
code, update the right `AGENTS.md`, update the skill (prose *and* any
copy-paste template — see "Why this exists" above for what happens when
only the prose gets updated), add/update an ADR if it's a genuine
architectural decision, add a regression test, add or update a guard in
`scripts/architecture_guard.py` if the pattern is mechanically detectable,
and confirm it runs in CI. Then run
`python scripts/check_agent_governance.py` — it catches several of the
most common ways a "persisted" rule quietly isn't (skill out of sync,
dangling ADR reference, missing `@AGENTS.md` import).

## How to test a skill

There's no runtime to "execute" a skill against — validate it the way
`scripts/tests/` validates the governance scripts themselves: write a
regression test in `scripts/tests/` if the skill's rule is mechanically
checkable (add it to `architecture_guard.py` first, then test the guard),
and otherwise dry-run the skill against a realistic prompt and check the
output against the skill's own stated checklist/commit checklist.

## How to fix divergences

```bash
python scripts/sync_agent_skills.py --check   # see exactly what's missing/divergent/extra
python scripts/sync_agent_skills.py           # fix it
python scripts/check_agent_governance.py      # confirm structural consistency
python scripts/architecture_guard.py --inventory  # see every content-level finding, blocking or not
python scripts/architecture_guard.py          # confirm no blocking finding remains
```

## How to run the commands locally

All four governance scripts are plain, dependency-free Python 3 (stdlib
only) and run identically on Windows, Linux, and macOS:

```bash
python scripts/sync_agent_skills.py [--check]
python scripts/check_agent_governance.py
python scripts/architecture_guard.py [--inventory]
python scripts/claude_stop_guard.py   # normally only invoked by the Stop hook itself
```

Full stack gates remain as documented in the root/area `AGENTS.md` files
and `docs/QUALITY.md` — the governance scripts are a fast, deterministic
layer in addition to those, never a replacement for build/test/lint/
coverage.

## How to use the templates

`prompts/agent-task-template.md` (generic) and the three specialized
variants (`backend-feature-template.md`, `frontend-feature-template.md`,
`architecture-review-template.md`) are plain Markdown with no tool-specific
syntax — copy one, fill in every section, and send it to whichever agent
you're using. They name skills in plain language (`Skills to use:
agenza-backend-use-case`) instead of a tool-specific invocation syntax,
since both Claude Code and Codex discover a skill from its description
once told to look for it.

## Tool-specific limitations

- **Claude Code**: discovers skills automatically from `.claude/skills/`
  descriptions; the Stop hook only runs inside a Claude Code session
  (`.claude/settings.json`). Subagents (`.claude/agents/`) are Claude Code
  only — Codex has no equivalent concept, so their instructions must never
  be the only place a rule lives (they only point at `agent-skills/` and
  `AGENTS.md`).
- **OpenAI Codex**: reads `AGENTS.md` files and `.agents/skills/`
  directly; it has no hook mechanism, so it relies entirely on the
  "Mandatory commands" section of `AGENTS.md` being followed and on CI as
  the backstop. Skill *discovery* by description-matching is Codex's own
  behavior and not something this repo configures.
- **Both**: neither tool is required for `scripts/*.py` or CI to work —
  every guard runs as plain Python, and
  `.github/workflows/agent-governance.yml` has no dependency on either
  tool being installed.
