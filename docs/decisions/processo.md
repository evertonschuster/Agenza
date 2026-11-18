# Decisions: process

## Documentation, decisions and agent instructions

### Decision

**Every fact has one home.** Everything else points to it, without copying.

| Source                              | Holds                                                               |
| ----------------------------------- | ------------------------------------------------------------------- |
| Code, configuration, pins and CI    | The implemented behavior and what is actually checked               |
| Tests                               | Behavior and acceptance criteria                                    |
| Root and area `AGENTS.md`           | Invariants and routing by task                                      |
| Each area's `docs/ARCHITECTURE.md`  | Current shape and conventions: the how                              |
| Skills in `.claude/skills/agenza-*` | Procedures, pointing to the rule instead of restating it            |
| `docs/decisions/`                   | The decision in a few lines, the why and what was rejected          |
| PR                                  | The conversation with the owner, review iterations and run evidence |

**Write only what the code does not show.** Folder layouts, inventories, versions and feature status
stay out of prose. A rule already in a guide is not repeated in the decisions, and the Rejected
alternatives live only in the decisions.

**Four files, no numbers.** `processo.md`, `plataforma.md`, `backend.md` and `frontend.md`. A new
decision becomes a section of its theme file, with Decision, Why when there is one, and Rejected.
Above 150 lines, the largest section becomes its own file, listed in the root `AGENTS.md`.

**What gets in.** A choice with an alternative an agent would plausibly propose, or a rule that spans
areas: boundary, security, shared contract, persistence, operation, relevant dependency or a choice
that is costly to reverse. The behavior of a screen or component, a reversible tweak and review
iterations stay in the code, the tests and the PR.

**Edit in place.** While the product is not in production, a decision that changes is rewritten in
its own file, without status, date or amendment chains; git keeps the history. What stopped
applying moves to Rejected with its reason.

**Citations.** Markdown points to the decisions file, naming the section in text when it helps;
`check:docs` validates the file, not the anchor. A code comment does not cite documents: it explains
the why in one line.

**Review commits do not change Markdown.** If the behavior changed, the test changes. Decisions and
guides touched by the PR are settled in the last commit before the merge.

**The structure does not change without a failure.** Reorganizing the documentation needs a concrete
failure recorded in the PR, such as an agent that contradicted a guide or proposed a Rejected
alternative again.

**Planning without a spec tool.** Before coding new behavior, the material doubts go to the owner in
a single batched round of questions, each with the recommended option. An approved prototype is the
visual reference. Acceptance criteria become pt-BR-named tests in the same PR; a prototype correction
becomes a test or code. Plan and tasks stay in the agent's session.

**Agent hosts.** `CLAUDE.md` imports `AGENTS.md`; Copilot reads the bridge in
`.github/copilot-instructions.md`; Codex follows the `AGENTS.md` hierarchy. There are no editable
mirrors, home-grown syncing or symlinks between these sources.

**Mechanical check.** `npm run check:docs` checks links and the `CLAUDE.md` imports. It does not
check whether the text agrees with the code.

### Why

The previous record (92 ADRs and the Spec Kit specs) piled up amendment chains and changed in almost
every PR. Without production, it was redone from scratch; the old one is in the tag
`docs-archive-2026-11-14`.

### Rejected

- **A governance framework with copies synced per host.** The copies diverged and the checks compared
  copies, not content; it was abandoned.
- **Spec Kit with a local preset.** Little use, 67 files and re-materialization through the CLI on
  every command change.
- **A living behavior document per feature** (`behavior.md`, `docs/features/`). It repeats the spec
  problem: every review would need to sync it.
- **Immutable ADRs with a proposed/accepted cycle before production.** They produced amendments and
  status-only commits; git already keeps the history.
- **A single decisions file, or a numbered file per decision.** The single one would be read whole on
  every lookup; numbered files invited adding one more. The owner's decision: a few files by theme.
- **Rejected alternatives repeated in the guides.** The two copies diverged and cited numbers that
  changed.

### Reversal

If, in two new features, an agent repeats an ambiguity already settled for lack of a record, a
single-file spec template comes back, with behavior and acceptance, without a tool.

## Git, CI and toolchain

### Decision

- **Trunk-based.** Only `main` is permanent and always releasable. Work goes through a PR, on a short
  branch cut from an up-to-date `main`; nothing is committed directly to `main`.
- **A feature that spans backend and frontend is two PRs**, both cut from `main`: the backend one
  first, carrying the regenerated OpenAPI types; then the frontend one. Each passes its own gates on
  its own.
- **CI is the authority on gates.** The repository installs no local hooks; whoever contributes,
  person or agent, runs the applicable commands before calling the work done.
- **Compatibility pins stay until the next stable line supports the change**, for example TypeScript
  until a stable typescript-eslint accepts the new version. Each pin's reason lives in the PR that
  creates it.

### Rejected

- **A permanent `develop` or staging branch.**
- **Husky and lint-staged.** They duplicated CI and blocked local commits without being the
  authority.
- **A pre-commit that refused commits on `main`.** GitHub branch protection is already that
  authority.

## Tests and verification

### Decision

- **The backend has no in-process integration layer.** No Testcontainers or `WebApplicationFactory`.
  `PersistenceTests` with EF InMemory exist only to prove tenant assignment, filters, conversions and
  the coverage of tag-deletion relationships.
- **The real proof runs on the Aspire stack**, in CI's contract job: migrations from scratch, OIDC,
  isolation between tenants, tenant foreign keys and drift of the generated types.
- **Tests are chosen by behavior and risk**, refusal paths included. A documentation-only change
  checks references, formatting and the diff.
- A PostgreSQL property outside the smokes' reach is checked by hand on a disposable database, and
  what ran is recorded in the PR.

### Rejected

- **Integration projects with containerized PostgreSQL in CI.** They started five to seven containers
  in parallel and were removed instead of stabilized.
- **A dedicated runtime test layer** with Testcontainers and an in-process host. It was created and
  removed: the Aspire job proves the same boundaries with the real stack.
- **FluentAssertions 8 or later**, for licensing.
