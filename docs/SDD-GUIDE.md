# SDD Guide — developing with AI agents in this repo

How a developer (human) delivers features here by directing an AI agent
instead of typing every line. This is the human-facing companion to the
agent-facing instruction files (`CLAUDE.md`, `.skills/`).

The core idea: **the documentation is the spec, the agent is the
executor, CI is the verifier.** Your job shifts from writing code to
writing specs, reviewing diffs, and keeping the docs truthful.

---

## The instruction stack (what the agent reads, in order)

```
CLAUDE.md (root)                      repo-wide non-negotiables (tenant scoping, layering)
├── apps/admin-frontend/CLAUDE.md     TS strictness, testing strategy, design language
│   ├── .skills/*/SKILL.md            step-by-step how-tos (feature vertical, TDD, API contract)
│   └── docs/ STATUS · DOMAIN · API · DECISIONS · adr/
├── backend/CLAUDE.md                 layering, rich domain, tenant scoping, test tiers
│   └── .skills/*/SKILL.md            backend-use-case · backend-new-microservice
└── docs/ VISION · MONOREPO · QUALITY · adr/
```

You rarely need to paste any of this into a prompt — agents discover it.
What you must do is **keep it true** (see "Your responsibilities" below).

---

## The loop

1. **Spec** — write down what you want *before* prompting: entities,
   endpoints, shapes, error cases. For a REST feature that means the API
   contract; for a domain change, the invariants. If the spec lives only
   in your head, the agent will invent the missing parts.
2. **Prompt** — point the agent at the work, naming the feature and any
   spec docs. The skills make the agent ask for what's missing (e.g. the
   feature-vertical skill refuses to invent field names).
3. **Watch the gates** — the agent must land: build + tests + lint green,
   coverage gate passing. That's not a courtesy, CI enforces it
   (see [QUALITY.md](QUALITY.md)).
4. **Review the diff** — you review architecture and product intent;
   the gates already reviewed mechanics. Check: tenant scoping, layer
   boundaries, whether tests assert behavior (not implementation).
5. **Docs updated in the same change** — STATUS.md rows flipped, ADR
   added if a decision was made. A PR that changes behavior without
   updating STATUS is incomplete.

---

## Worked examples

### 1. Build a feature vertical (the common case)

> Build the Services vertical in the admin frontend. API spec:
> `GET/POST /api/services`, `PUT/DELETE /api/services/{id}`.
> Service = { id: uuid, name: string (1..80), durationMinutes: int > 0,
> priceCents: int >= 0, active: bool }. Errors: 400 validation,
> 404 unknown id. Follow the admin-feature-vertical skill.

What should happen (and what to check): the agent reads the skill +
STATUS.md, builds domain entity → use cases → repository → hook → page
in TDD order, adds MSW handlers, flips the STATUS rows, and all gates
pass. If it starts inventing fields you didn't specify, your spec was
incomplete — fix the spec, not the diff.

### 2. Add a backend use case / endpoint

> In identity-service, add a "rename tenant" operation:
> PUT /internal/v1/tenants/{id} with { name }, guarded by the
> identity-admin scope. Follow the backend-use-case skill.

Expect: a `RenameTenant` command slice (Command/Handler/Validator) under
`Application/Tenants/`, a behavior method on the `Tenant` entity (not a
public setter), the handler returning `Result` instead of throwing for
a not-found tenant, unit tests with fakes asserting on the `Result`,
an integration test hitting 401/403/400/happy-path, and the coverage
gate still green.

### 3. Stand up a new microservice

> Create notification-service following the backend-new-microservice
> skill. First capability: POST /internal/notifications/email
> (M2M, scope notifications-api) that persists an outbox row —
> no real SMTP yet.

Expect: five projects wired per the skill, own Postgres schema
(`notification`), auth via `Admin.Identity.Client`, docker-compose +
Aspire entries, and a new scope seeded in identity-service.

### 4. Fix a bug

> Logging out and logging back in sometimes lands on /login with no
> error. Reproduce it with a failing test first, then fix. Suspects:
> silent-renewal flow (see frontend ADR 004).

Expect: a failing test that captures the bug *before* the fix — that's
the project's TDD convention, and it's what stops regressions.

### 5. Make an architecture decision

> We need file uploads (client photos). Evaluate object storage vs
> Postgres bytea for our scale, propose one, and write it as
> docs/adr/0005. Don't implement yet.

Decisions get an ADR *before* implementation; the next agent (or you,
in six months) reads why, not just what.

---

## Prompt patterns that work here

| Weak prompt                      | Strong prompt                                                              |
| -------------------------------- | --------------------------------------------------------------------------- |
| "add a services page"            | Names the vertical + full API contract + points at the skill (example 1)   |
| "make the backend better"        | One concrete outcome: "add integration tests for the userinfo endpoint"    |
| "fix the login bug"              | Symptom + repro steps + where you suspect it lives + "failing test first"  |
| "write docs"                     | "Flip the STATUS rows for Services and add an ADR for the polling choice"  |

Two more habits that pay off:

- **One vertical per session.** Small, reviewable increments beat a
  10-file mega-prompt. The build order in the frontend's STATUS.md is
  the roadmap.
- **Ask for analysis without a fix** when you're exploring ("is our
  tenant scoping airtight? report, don't change anything") — then a
  second prompt to implement what you agreed with.

---

## Your responsibilities (the parts AI can't own)

- **Spec quality.** Ambiguity in, hallucination out. The API contract,
  the domain invariants, and the product decisions are yours.
- **Doc truthfulness.** Stale docs are worse than no docs — an agent
  trusts STATUS.md more than it trusts the code. If you hand-change
  behavior, update the docs in the same commit.
- **Review.** Gates catch broken; you catch *wrong*. Tenant scoping and
  security-sensitive diffs (`Admin.Identity.Client`, OpenIddict config,
  anything touching tokens) deserve a human read, always.
- **Decisions.** Agents propose, ADRs record, you decide.

## Definition of done (any stack)

Build green · tests green · lint/format green · coverage gate green ·
STATUS/ADR updated · CI green on the PR. If any of those is red, the
work isn't done — regardless of how good the diff looks.
