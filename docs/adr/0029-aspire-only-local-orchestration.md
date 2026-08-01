# ADR 0029 — Aspire is the single local application orchestrator

Status: accepted (2026-07)

## Context

The repository had two independent graphs for the same local application:
`backend/AppHost/AppHost.cs` and `infra/docker-compose.yml`. Both described
the frontend, .NET services, Python assistant, PostgreSQL, ports, credentials,
startup ordering, and environment variables. CI also built application images
that this demo does not deploy.

Maintaining both graphs makes every resource or configuration change a
two-place edit. The graphs had already drifted: Aspire did not inject the full
frontend OIDC configuration, while Compose did; PostgreSQL persistence and
desktop-client access were documented around Compose even though Aspire is the
actual development entry point.

The application is still under construction and has no production deployment
design. Dockerfiles therefore do not represent an exercised delivery artifact;
they are speculative infrastructure.

## Decision

.NET Aspire is the only application orchestrator for local development and
runtime contract CI:

- AppHost owns PostgreSQL, identity-service, services-service,
  assistant-service, and admin-frontend;
- PostgreSQL uses the stable `agenza-postgres-data` volume and host port 5432;
- AppHost injects one shared local-development password into PostgreSQL,
  restricted database roles, and internal OAuth clients, plus service
  references and the frontend's complete OIDC/API environment;
- safe local-demo parameter defaults allow a zero-configuration first run and
  remain overridable through .NET user secrets;
- the API-contract CI job starts AppHost and runs the OpenAPI drift and real
  OIDC/tenant smoke against that graph; and
- Docker Compose, application Dockerfiles, and their `.dockerignore` and
  Dependabot configuration are removed.

Docker remains a prerequisite because Aspire uses a PostgreSQL container. This
decision does not prohibit containers in a future deployment. It prohibits
adding an unexercised second local orchestration graph. A production packaging
or deployment design must be introduced by a new ADR with its own CI proof.

## Fitness functions

- `scripts/architecture_guard.py` blocks Compose and application Dockerfiles;
- the guard requires AppHost resources for PostgreSQL, both .NET services,
  Uvicorn, and Vite;
- the guard requires a stable PostgreSQL host port, data volume, init files,
  and frontend API/OIDC environment;
- the guard requires the API-contract workflow to start `backend/AppHost` and
  rejects `docker compose` in that workflow; and
- build, unit/coverage tests, the AppHost runtime smoke, OpenAPI generation
  check, and OIDC tenant-boundary smoke remain CI gates.

## Consequences

There is one authoritative place to understand and evolve the local runtime
topology. Local development and runtime contract CI use the same resource
graph, reducing configuration drift.

Developers need the .NET, Node, and Python toolchains locally; there is no
fully containerized fallback. This is accepted for the current development
workflow. PostgreSQL remains reachable from a desktop client at
`localhost:5432`, database `appdb`, user `postgres`, password `postgres` unless
the AppHost parameter is overridden.

Sharing one password is deliberately limited to this local demo. Database
users and their grants remain separate, so a service still cannot access
another service's schema. A production deployment must replace the shared
development password with independently managed credentials.

There is deliberately no production image output. When deployment becomes a
real requirement, its runtime artifacts, secret model, migration execution,
health probes, and rollback path must be designed and tested as one coherent
delivery path rather than inferred from local-development files.
