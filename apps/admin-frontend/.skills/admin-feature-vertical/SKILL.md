---
name: admin-feature-vertical
description: >
  OBSOLETE — superseded by agent-skills/agenza-frontend-feature. Do not
  use this file; read the canonical skill instead.
---

# Admin Feature Vertical (obsolete — moved)

This skill's content moved to
[`agent-skills/agenza-frontend-feature/SKILL.md`](../../../../agent-skills/agenza-frontend-feature/SKILL.md)
(distributed to `.claude/skills/agenza-frontend-feature/` and
`.agents/skills/agenza-frontend-feature/` by
`scripts/sync_agent_skills.py`) as part of the cross-tool governance
migration (see `docs/AGENT-GOVERNANCE.md`).

The migration also caught this file describing forms as "a plain,
dialog-agnostic `<form>`" with no mention of React Hook Form, Zod, or
structured server-error-to-field mapping — the codebase moved past that
description (see `TagForm.tsx`, `serverFormError.ts`,
`useCreateInline.ts`) without this skill being updated to match. The
canonical skill documents the current form/error/inline-creation pattern.
Read the canonical skill, not this file.
