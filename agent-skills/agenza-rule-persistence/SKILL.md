---
name: agenza-rule-persistence
description: >
  Use whenever the user corrects an agent's approach, an architectural bug
  repeats, a review surfaces a recurring pattern, an important rule
  changes, or an exception needs to be formalized. Trigger on "remember
  this", "don't do that again", "we already decided X", or after fixing
  anything that looks like a repeat of a past mistake. Turns a one-off
  correction into a durable rule across every place that needs to agree,
  instead of a fix that only lives in this conversation.
---

# Rule Persistence

A correction is not durable just because it was said once. Before treating
anything as "handled," judge which of these it is:

- **One-off**: specific to this exact change, doesn't generalize. No
  persistence needed beyond the fix itself.
- **Durable architectural rule**: would apply to any future similar
  change.
- **New business constraint**: a product/domain rule, not a coding
  pattern.
- **Process improvement**: how work should be done (testing, review,
  documentation), not what the code does.

Only the last three need this skill's checklist.

## The persistence cycle

For a durable rule, work through every applicable step — skipping one
without a reason is how a rule "gets fixed" once and quietly regresses
three months later:

1. **Fix the code.** The concrete instance that triggered this.
2. **Update `AGENTS.md`.** Root `AGENTS.md` if it applies everywhere;
   `backend/AGENTS.md`/`apps/admin-frontend/AGENTS.md` if it's area-local.
   State the rule, not a narrative of how it was discovered.
3. **Update the skill.** If a skill in `agent-skills/` teaches the old
   pattern (in prose *or* in a copy-paste template — templates rot
   silently because they're copied verbatim without re-reading the prose
   around them), fix it there. Run `python scripts/sync_agent_skills.py`
   afterward so `.claude/skills/`/`.agents/skills/` pick up the change.
4. **Add or update an ADR.** If this is a genuine architectural decision
   (not just a bug fix), it needs `docs/adr/NNNN-....md` explaining the
   context, the decision, and — if it reverses an earlier ADR — which one
   and why (see docs/adr/0012, docs/adr/0014 for the citation style this
   repo uses when one ADR supersedes another).
5. **Add a regression test.** One that would have failed before the fix
   and passes after. Without this, nothing stops the same bug from
   reappearing in a different feature.
6. **Add or update an automated guard.** If the pattern is mechanically
   detectable, add it to `scripts/architecture_guard.py` (see that
   script's own contribution notes for how to add a check without
   widening its allowlist). If it isn't mechanically detectable, say so
   explicitly in the ADR rather than silently skipping this step.
7. **Wire it into CI.** Confirm the guard/test from steps 5–6 actually
   runs in `.github/workflows/` — a local-only check that never runs in
   CI isn't a gate, it's a suggestion.

## Also check for teaching debt

A rule can be technically "fixed" in the places above and still get
reintroduced because something else still teaches the old pattern. Check:

- Other `CLAUDE.md`/`AGENTS.md` files that might restate the rule locally
  and now disagree with the update.
- Older skills (including ones outside `agent-skills/`, like
  `backend/.skills/`/`apps/admin-frontend/.skills/`) that predate the
  change.
- Comments in code that assert the old rationale.
- `prompts/` templates and worked examples in `docs/SDD-GUIDE.md`.
- Test files whose names or comments describe the old behavior as
  correct, even if the assertions themselves were updated.

## Definition of "persisted"

A rule counts as persisted only when every applicable item in the cycle
above is done — not when the immediate bug is fixed. If any step
genuinely doesn't apply (e.g. no ADR is warranted for a pure typo fix),
say so explicitly rather than leaving it silently incomplete. Run
`python scripts/check_agent_governance.py` after this cycle — it flags
skills not in sync, ADR references that don't exist, and
`CLAUDE.md` files missing the `@AGENTS.md` import, three of the most
common ways a "persisted" rule quietly isn't.
