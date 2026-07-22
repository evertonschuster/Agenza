---
name: agenza-architecture-review
description: >
  Use for a general architecture audit of this monorepo — on request,
  periodically, or before a release. Trigger on "architecture review",
  "audit the codebase", "is our architecture sound?", or when asked to
  check consistency across the monorepo, Clean Architecture layering,
  vertical slices, multi-tenancy, the Result pattern, testing, migrations,
  documentation, CI, or dependencies. Review-only by default — implements
  and validates fixes only when the task explicitly asks for
  implementation, not just a report.
---

# Architecture Review

## Scope

Check, across whichever of these areas are in scope for the request:

- **Monorepo structure**: does `docs/MONOREPO.md` still match reality?
  New app/service not listed, a stale entry for something removed?
- **Clean Architecture / layering**: any dependency pointing outward
  (Domain referencing Application/Infrastructure, `domain/`/`application/`
  in the frontend importing React or `infrastructure/`/`presentation/`)?
- **Vertical slices / feature organization**: backend `Application/<Feature>/<Operation>/`
  shape followed? Frontend feature folders self-contained, no cross-feature
  imports?
- **Multi-tenancy**: delegate the deep pass to
  `agent-skills/agenza-tenant-isolation-review` rather than duplicating it
  here — this review only checks that tenant scoping is *present* where
  expected, not the full mechanism.
- **Exceptions / Result pattern**: delegate the deep pass to
  `agent-skills/agenza-exception-flow-audit`.
- **Domain model**: anemic entities (public setters, no invariant
  enforcement), missing `DomainResult` usage, entities bypassing
  `BaseEntity`/`TenantOwnedEntity` without a documented reason.
- **Persistence**: query filters applied by hand instead of via
  `ApplyAuditableConventions`, missing indexes for a new uniqueness rule,
  a migration issue — delegate depth to
  `agent-skills/agenza-migration-safety`.
- **Contracts**: delegate to `agent-skills/agenza-api-contract-review`.
- **Frontend**: layering (see above), `any` usage, design-system drift
  (raw palette classes instead of semantic tokens), reusable-component
  discipline (`agent-skills/agenza-frontend-feature`).
- **Accessibility**: keyboard operability, accessible names, contrast —
  sample a few recently-changed pages rather than the whole app unless
  asked for a full sweep.
- **Tests**: coverage gate status, mock-strategy-per-layer discipline
  (frontend), no integration-test reintroduction without an ADR reverting
  docs/adr/0015 (backend).
- **Migrations**: `agent-skills/agenza-migration-safety`.
- **Documentation**: `AGENTS.md`/`CLAUDE.md` files still accurate and in
  sync (`scripts/check_agent_governance.py` covers the mechanical half of
  this), STATUS.md rows matching what's actually built, ADRs referenced
  by number actually existing.
- **CI**: workflows still matching the commands documented in
  `docs/QUALITY.md`, coverage gates not silently loosened.
- **Dependencies**: any package pinned for a documented reason
  (`docs/QUALITY.md`, `README.md`'s Versions table) that a routine bump
  would silently violate.

## Mode: review-only (default)

Produce a diagnosis, not a diff. For each finding:

- **File/location**
- **What's wrong** (one sentence)
- **Why it matters** (tie back to a rule in `AGENTS.md`, an ADR, or a
  skill — don't invent a new rule mid-review; if there's genuinely no
  existing rule this violates, that's a finding for
  `agent-skills/agenza-rule-persistence` to formalize, not a silent
  judgment call)
- **Severity**: blocks tenant isolation / security > breaks a build gate
  > architectural drift > style nit
- **Suggested fix** (one sentence — enough to hand to the relevant build
  skill, not a full patch)

Do not edit code in this mode, even for an "obvious" one-line fix.

## Mode: implement (only when explicitly requested)

1. **Diagnose** using the review above.
2. **Fix**, using the matching build skill for the area
   (`agenza-backend-use-case`, `agenza-frontend-feature`,
   `agenza-migration-safety`) rather than ad hoc edits.
3. **Validate**: run the commands in the relevant `AGENTS.md`
   ("Mandatory commands") plus `scripts/architecture_guard.py`.
4. **Report evidence**: paste the actual command output (or a faithful
   summary of it) showing the gate now passes — not just "should be
   fixed now."

## Non-goals

- Don't rewrite working code to a "nicer" pattern with no rule behind it —
  see the repo-wide anti-speculation rule in root `AGENTS.md`.
- Don't silently widen an allowlist, delete a test, or lower a coverage
  gate to make a finding go away — that's the exact anti-pattern this
  governance framework exists to prevent (see `docs/AGENT-GOVERNANCE.md`).
