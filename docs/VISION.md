# Platform vision — target architecture

Where this monorepo is heading. Agents: treat this as the map when
deciding *where* new code belongs; treat `MONOREPO.md` as the map of
what exists *today*.

## Frontends — always React (`apps/*`)

| App              | Status  | Purpose                                                        |
| ---------------- | ------- | -------------------------------------------------------------- |
| `admin-frontend` | active  | Admin panel for business owners (Clean Architecture, strict TS) |
| `user-app`       | planned | Lightweight end-user app (booking, messages) — simpler than admin: fewer layers are acceptable, but tenant scoping and strict TS still apply |
| `company-site`   | planned | Company marketing site — mostly static, SEO-focused             |

All React + TypeScript, npm workspaces, shared DTO/contract types in
`packages/shared-types`. New apps copy `admin-frontend`'s tooling
(Vite, Vitest, ESLint boundaries) unless an ADR says otherwise.

## Backend — context-aggregated .NET services (`backend/services/*`)

Not fine-grained microservices (ADR 0001): each service is a small,
explicit-purpose monolith owning one business context end-to-end —
its own domain model, its own schema, its own API.

| Service            | Status   | Context it owns                                              |
| ------------------ | -------- | ------------------------------------------------------------ |
| `identity-service` | active   | Authentication (OIDC/OpenIddict), tenants, users, M2M tokens |
| `services-service` | active   | The business's offering: Tags (done) is the first vertical; services catalog, appointments and clients belong here too unless they grow enough to justify their own context |
| `notification-service` | planned | Email/SMS/push — one place for templates, delivery, retries |

Cross-service communication: HTTP with M2M JWTs from identity-service
today; async events later if/when a real need appears. Never shared
tables, never in-process calls across services.

## AI services — Python/FastAPI (`ai-services/*`)

| Service             | Status | Purpose                                                  |
| ------------------- | ------ | --------------------------------------------------------- |
| `assistant-service` | active (skeleton) | Chatbot/receptionist AI; validates identity-service JWTs via JWKS |
| analytics           | planned | Analysis/reporting over business data                     |

Python services are consumers of the same identity: inbound tokens
validated against identity-service's JWKS, outbound M2M via client
credentials. They never touch another service's database.

## How we build (SDD — spec/agent-driven development)

The repo is optimized for AI-assisted delivery — the developer-facing
walkthrough with worked example prompts is [SDD-GUIDE.md](SDD-GUIDE.md):

1. **Instructions are layered**: root `CLAUDE.md` → per-area `CLAUDE.md`
   (frontend, backend) → `.skills/` how-to guides → `docs/` references
   (STATUS, DOMAIN, API, ADRs). An agent reads the layer it needs; specs
   live in docs, not in chat history.
2. **State is machine-readable**: `STATUS.md` files say what's done,
   stubbed, and blocked, in dependency order. Update them as part of the
   change, not after.
3. **Quality is enforced, not requested**: CI gates (80% coverage, lint,
   typecheck, CodeQL, Sonar) mean an agent's "done" is verifiable —
   see `docs/QUALITY.md`.
4. **Decisions are recorded**: anything a future agent might re-litigate
   gets an ADR (`docs/adr/` for cross-cutting,
   `apps/admin-frontend/docs/adr/` for frontend-local).
