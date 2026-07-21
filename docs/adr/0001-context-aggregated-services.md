# ADR 0001 — Context-aggregated services, not fine-grained microservices

Status: accepted (2026-07)

## Context

The backend needs to scale in team-size and deployability, but this is a
small product built largely with AI-assisted development. Classic
fine-grained microservices multiply operational cost (deploys, contracts,
observability, versioning) far faster than they pay off at this scale.

## Decision

Each backend service is a **context-aggregated service**: a small
monolith with one explicit business context, owning several related
capabilities. identity-service owns authentication AND tenant/user
provisioning; a future notification-service would own email AND sms AND
push. We split a context out of an existing service only when it has
clearly divergent scaling, ownership, or release needs.

Rules that keep the boundaries real:

- Each service: own Clean Architecture stack, own DB schema, own API.
- Cross-service calls: HTTP + M2M JWT (later: events). Never shared
  tables or in-process references across services.
- Shared code is limited to security-critical cross-cutting
  infrastructure (`backend/shared/Admin.Identity.Client`) — never business
  logic.

## Consequences

- Fewer moving parts per feature; an agent can deliver a full vertical
  inside one service.
- Some contexts will live together until a split is justified —
  acceptable; the layering keeps future extraction cheap.
- The word "microservice" in older docs means *this*, not nano-services.
