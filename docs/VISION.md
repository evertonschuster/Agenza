# Platform vision

This document guides ownership decisions; it is not an implementation backlog.
`MONOREPO.md` and app `STATUS.md` files describe what exists now. Never scaffold
a planned component without an explicit product task.

## Product surfaces

| Surface | State | Direction |
| --- | --- | --- |
| `admin-frontend` | active | Admin UI for tenant business owners/staff |
| end-user booking/messaging app | planned | Lightweight React client when product rules exist |
| company marketing site | planned | Static/SEO-focused site when needed |

React applications use strict TypeScript. Tooling may be shared only after a
second real consumer exists; do not create speculative shared packages.

## Backend contexts

Agenza uses context-aggregated .NET services rather than one service per entity.
Each context owns its domain, API, schema, and writes.

| Context/service | State | Ownership |
| --- | --- | --- |
| `identity-service` | active | OIDC/OpenIddict, tenants, users, internal clients |
| `services-service` | active | Business offerings/catalog; nearby scheduling/client capabilities stay here unless evidence justifies a split |
| notification delivery | planned | Templates, delivery, retries for email/SMS/push when required |

Services communicate through explicit HTTP contracts today. Async events are
introduced only for a demonstrated decoupling or reliability requirement.

## AI boundary

`assistant-service` is an active security/runtime skeleton, not an implemented
AI receptionist. It validates identity and tenant context so future model,
conversation, or tool behavior starts behind the correct boundary. Provider,
model, memory, orchestration, and prompt architecture remain undecided until a
concrete AI use case and evaluation criteria exist.

AI services consume explicit APIs and tokens; they never read another service's
database. Tenant-owned delegation remains bound to the caller or to an explicit
tenant-scoped job identity.

## Delivery principles

- Implement one complete vertical at a time.
- Prefer current code/config/contracts over planned diagrams.
- Record durable decisions in ADRs and current progress in living status docs.
- Use automated gates as independent evidence, not an agent's completion claim.
