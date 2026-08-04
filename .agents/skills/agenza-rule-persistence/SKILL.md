---
name: agenza-rule-persistence
description: >
  Use when a correction or recurring defect establishes a reusable repository
  rule. Persist durable architecture, business, or process constraints without
  turning one-off task detail into permanent agent context.
---

# Rule persistence

First classify the correction:

- one-off implementation detail: fix it, do not add agent rules;
- durable area/repository constraint: update the smallest owning instruction;
- business rule: encode in domain/spec/tests;
- architectural decision: add or amend an ADR and its index.

For a durable rule, apply only relevant layers:

1. fix the concrete code/documentation;
2. add a regression test;
3. update the nearest `AGENTS.md` or one matching skill without duplicating the
   rule across both unless routing requires it;
4. add/update an ADR only for durable rationale or reversal;
5. add an architecture/governance guard when mechanically detectable;
6. confirm CI runs the test/guard;
7. remove stale comments, examples, active docs, and generated skill copies.

Edit `.agents/skills/`, then sync `.claude/skills/`. Do not create a new skill
for a one-off prompt or a rule already owned clearly elsewhere.

Run:

```bash
python scripts/sync_agent_skills.py
python scripts/sync_agent_skills.py --check
python scripts/check_agent_governance.py
python scripts/architecture_guard.py
```

Report any layer intentionally not changed and why.
