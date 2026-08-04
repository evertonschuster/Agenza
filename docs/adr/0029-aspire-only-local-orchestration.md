# ADR 0029 — Aspire is the only local orchestration path

Status: accepted (2026-07). This document records the current decision only.

## Context

Maintaining Aspire, Docker Compose, per-application Dockerfiles, and separate
manual wiring would duplicate ports, environment keys, secrets, health ordering,
and runtime behavior in a pre-deployment demo.

## Decision

- `backend/AppHost/AppHost.cs` is the canonical local resource graph.
- AppHost starts PostgreSQL, identity-service, services-service,
  assistant-service, and admin-frontend with their references and readiness
  ordering.
- AppHost injects connection strings, internal OAuth credentials, service URLs,
  and frontend/assistant environment values.
- PostgreSQL may run as an Aspire-managed container; application services run
  through their native project tooling.
- Local application ports remain fixed where required by OIDC issuer, redirect,
  CORS, and smoke contracts.
- CI reuses the AppHost graph for focused runtime/OpenAPI/OIDC smoke.
- Do not add a parallel Compose file or application Dockerfiles until a
  production deployment ADR defines image, secret, migration, networking, and
  observability requirements.

## Local secret model

One AppHost secret parameter supplies the disposable local database roles and
internal OAuth clients. It is a demo convenience, not a production credential
strategy. Overrides use AppHost user secrets; tracked files must not receive
real secrets.

## Consequences

Local runtime wiring has one owner. A future production topology may use
containers or another orchestrator, but it must be designed explicitly rather
than inferred from the local AppHost.
