# ADR 0041 — AI instruction files reinstated, without the sync machinery

Status: accepted (2026-09)

Replaces the open concern left by [ADR 0016](0016-ai-agent-governance-framework.md)
(abandoned).

## Context

ADR 0016 established a cross-tool agent governance framework: `AGENTS.md` at root and per area,
`.agents/skills/` as the single editable skill source, a `sync_agent_skills.py` script copying it
to `.claude/skills/`, import-only `CLAUDE.md` files, a Copilot bridge, and governance checks in
CI. It was **abandoned** in 2026-08 and removed wholesale — 391 files in commit `bfd16b8` — with
no replacement. The ADR index has since read: *"There is currently no repository decision on this
concern."*

The abandonment was correct about the failure, and the failure is worth restating precisely,
because it is the thing this ADR must not repeat:

> Several copies taught patterns already reverted in code […] Mechanical sync checks passed
> because they verified copies, not semantic truth.

The framework's problem was never that instructions existed. It was that instructions **restated**
things — package versions, file inventories, test counts, feature status, implementation
templates — and then a script proved the restatements matched each other while all of them
drifted away from the code.

Since the removal, every agent session has re-derived the same context from scratch: the FSD layer
rules, the `Result` convention, the CI gates, the lockfile constraint. That is expensive, and it is
error-prone in a way that is invisible until a review catches it.

There is also new evidence that the multi-tool premise still holds:
`apps/admin-frontend/.specify/integrations/` carries manifests for Claude, Codex and Copilot, so
the repository is in fact worked on through more than one agent.

## Decision

Reinstate the instruction files. Do **not** reinstate the machinery.

**What comes back:**

- `AGENTS.md` at the repository root and in `apps/admin-frontend/` — the tool-independent entry
  point. Codex reads it natively.
- `CLAUDE.md` as a thin import (`@AGENTS.md`) at both levels.
- `.github/copilot-instructions.md` as a bridge that states no rule of its own.
- `.claude/skills/agenza-*/` for repository-specific workflows, using progressive disclosure: a
  short `SKILL.md` that routes to `references/` only when a task touches that subject.

**What does not come back, and why:**

- **No `.agents/skills/` mirror and no sync script.** Two copies of a skill plus a checker that
  compares them is the exact mechanism ADR 0016 identified as the failure. Skills live in one
  place. Codex and Copilot get the tool-independent rules from `AGENTS.md`.

  This is **not** because the skill format is proprietary. The Agent Skills format — a directory
  holding a `SKILL.md` with YAML frontmatter — was published as an open specification in
  December 2025 and is read by roughly forty products, Codex CLI, GitHub Copilot, Cursor and
  Gemini CLI among them. The skills written here conform to it, and their content is
  tool-independent prose about this repository.

  What is not portable is the **discovery path**. Claude Code reads `.claude/skills/` (repository
  and user level, including nested ones); the other hosts read `.agents/skills/`. Serving both
  without a copy would take a symlink, and symlinks are unavailable on this team's Windows
  checkout — `core.symlinks` is `false` and creating one fails without Developer Mode. That
  leaves copying, which is the failed mechanism.

  So the constraint is environmental and current, not architectural and permanent. Worth noting:
  `.agents/skills/` is the path ADR 0016 chose and commit `bfd16b8` deleted. Its location was
  right; what failed was the drifting content and the checks that compared copies.
- **No governance CI job.** There is nothing mechanical left to check that would be checking
  semantics rather than string equality.

**The binding constraint, which is the substance of this ADR:**

> These files point at the sources of truth. They do not restate them.

Concretely, the following do **not** appear in any instruction file: package versions, file
inventories, test counts, coverage percentages, bundle sizes, feature status tables, or copied
implementation templates. Those live in lockfiles, in `package.json`, in the code, in
`docs/ARCHITECTURE.md`, and in the ADRs — all of which are executable or reviewed. An instruction
file that wants to convey one of them carries a link instead.

## Consequences

- The files can go stale only in their *pointers*, not in their *facts*. A dead link is visible;
  a silently wrong version number is not. This is the whole trade.
- Nothing enforces the no-restating rule but review. That is deliberate: the enforceable version of
  this rule is what failed last time. A reviewer's question — "is this fact also stated somewhere
  executable?" — is the check.
- Codex and Copilot get the shared rules from `AGENTS.md` but not the skills. Accepted asymmetry
  for now, and the one part of this decision expected to be revisited. **Revisit when** either of
  these becomes true: someone does substantive work here through Codex or Copilot, or symlinks
  become available on the team's checkouts. The candidate mechanisms at that point are a symlink
  from `.claude/skills` to `.agents/skills` — one real directory, so nothing can drift — or an
  installer that materialises the skills per host from a single source. A hand-rolled copy script
  is not a candidate.
- `docs/adr/README.md` must stop describing 0016 as leaving an open concern with no replacement
  decision, and point here.
- If a future contributor finds an instruction file restating something the code already says, the
  correct fix is to delete the restatement and link — not to add a check that the two agree.

## Alternatives considered

**Leave it abandoned.** Honest about the duplication risk, and the status quo since 2026-08.
Rejected because the cost is real and recurring: every session re-derives the same architecture
rules, and the ones it fails to re-derive show up as review comments instead.

**Restore ADR 0016 as written, sync script included.** Rejected on its own recorded evidence. The
portable-source-plus-mirror design is what produced copies that "taught patterns already reverted
in code".

**Claude-only, no `AGENTS.md`.** Simpler — one file format, no portability question. Rejected
because the Spec Kit integration manifests show Codex and Copilot are actually in use, and a
Claude-only file would leave those sessions with no rules at all.
