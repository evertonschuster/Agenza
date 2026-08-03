# SDD guide — working with agents in this repository

Documentation supplies constraints and intent; the agent implements; automated
gates verify mechanics; the human reviews product correctness.

## What to provide

For a feature or behavior change, give the smallest complete specification:

- desired outcome and affected app/service;
- business rules and invariants;
- public request/response/error shape when a contract changes;
- authentication/authorization expectations;
- acceptance criteria and explicit exclusions.

Do not paste the repository's instruction files into the prompt. Agents route
from `AGENTS.md` and load matching canonical skills. If a requested fact already
exists in code, generated OpenAPI, tests, migrations, or an accepted ADR, the
agent should find it before asking.

## Delivery loop

1. **Specify:** record product intent and any contract that cannot be inferred.
2. **Implement:** name the outcome; optionally name the relevant skill when you
   want a specific workflow emphasized.
3. **Verify:** require every gate listed by the affected `AGENTS.md`.
4. **Review:** inspect architecture, security, tenant isolation, and product
   behavior rather than trusting a green build alone.
5. **Persist:** update status/contract docs and ADRs in the same change; remove
   superseded teaching rather than keeping an active historical prompt.

## Prompt shape

```text
Outcome:
Scope / out of scope:
Business rules:
API or event contract (if affected):
Auth / tenant behavior:
Acceptance criteria:
```

For a repeatable workflow, name the matching skill under `.agents/skills/`.
Keep one-off detail in the task prompt rather than committing prompt templates.

## Useful examples

- “Add RenameTenant in identity-service. PUT shape and authorization are ...;
  return not-found/conflict as Result. Follow agenza-backend-use-case.”
- “Build the Clients frontend vertical from this OpenAPI contract. It must clear
  cached data on tenant switch and meet the listed accessibility criteria.”
- “Review tenant isolation for the new query. Report only; do not edit.”
- “Evaluate whether notifications belongs in an existing context or a new
  service. Decide first; do not scaffold until the boundary is justified.”

## Human responsibilities

- Decide product behavior and incompatible architectural choices.
- Review security-sensitive auth/tenant changes.
- Keep living docs truthful when making manual changes.
- Reject speculative abstractions even when tests pass.
- Do not declare completion while a required gate is red.
