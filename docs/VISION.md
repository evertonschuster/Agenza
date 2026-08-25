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

All React + TypeScript, npm workspaces. New apps copy `admin-frontend`'s
tooling (Vite, Vitest, ESLint boundaries) unless an ADR says otherwise.
`packages/shared-types` held shared DTO/contract types at one point but was
removed as unused while `admin-frontend` is the only Node app in the
workspace — recreate it once `user-app` or `company-site` actually exist and
need to share contracts with `admin-frontend`, rather than before.

## Backend — context-aggregated .NET services (`backend/services/*`)

Not fine-grained microservices (ADR 0001): each service is a small,
explicit-purpose monolith owning one business context end-to-end —
its own domain model, its own schema, its own API.

| Service            | Status   | Context it owns                                              |
| ------------------ | -------- | ------------------------------------------------------------ |
| `identity-service` | active   | Authentication (OIDC/OpenIddict), tenants, users, M2M tokens |
| `services-service` | active   | The business's offerings context: Tags, Categories, and Services; appointments and clients belong here unless evidence justifies another context |
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
