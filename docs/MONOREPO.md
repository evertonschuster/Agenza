# Monorepo structure

```
admin/
├── apps/
│   └── admin-frontend/     Vite + React 19 + TypeScript admin panel (see its own docs/)
├── backend/
│   ├── AdminBackend.slnx   .NET solution (dotnet 10 uses .slnx, not .sln)
│   ├── AppHost/            .NET Aspire orchestrator — local dev only, see below
│   ├── ServiceDefaults/    shared OpenTelemetry/health-check/service-discovery wiring
│   ├── shared/
│   │   ├── Admin.Identity.Client/       JWT validation + ITenantAccessor for resource services
│   │   ├── Admin.SharedKernel/          CQRS/Result-pattern kernel (docs/adr/0005) — Result,
│   │   │                                ICommand/IQuery + handlers, IDispatcher; framework-agnostic
│   │   └── Admin.SharedKernel.AspNetCore/  Result → IActionResult mapping + the generic
│   │                                        exception handler (docs/adr/0018) — only .Api
│   │                                        projects reference this one
│   └── services/
│       ├── identity-service/   OIDC provider (OpenIddict), tenants, users, M2M tokens
│       └── services-service/   the business's offerings — Tags,
│                               Categories, and Services verticals
├── ai-services/
│   └── assistant-service/  placeholder Python/FastAPI AI service
├── infra/
│   └── postgres/init/      roles and grants loaded by Aspire's Postgres resource
└── docs/                   monorepo-level docs only — app/service-specific docs live
                             inside that app/service's own folder
```

## Local development

The full stack has one local orchestration path:

- **`dotnet run --project backend/AppHost --launch-profile http`** — .NET
  Aspire starts the frontend, both .NET services, assistant-service, and
  PostgreSQL with one command. Its dashboard URL is printed on startup and
  provides live logs, traces, health, and resource lifecycle controls.
  Application ports are fixed at 5081/5080/8001/5173 because the OIDC public
  issuer, redirects, and CORS origin use those addresses. PostgreSQL is fixed
  at 5432 for desktop database clients and persists in the named
  `agenza-postgres-data` volume.

  Docker is required only as Aspire's container runtime for PostgreSQL. Node,
  Python 3.12, and `uv` must be installed; AppHost runs the npm and locked
  `uv sync` setup resources before starting Vite and Uvicorn.

  Safe demo defaults are built into AppHost, so the command works without
  secret setup. Override any of them through .NET user secrets when needed:

  ```bash
  dotnet user-secrets set "Parameters:postgres-password" "<value>" --project backend/AppHost
  dotnet user-secrets set "Parameters:identity-db-password" "<value>" --project backend/AppHost
  dotnet user-secrets set "Parameters:services-db-password" "<value>" --project backend/AppHost
  dotnet user-secrets set "Parameters:assistant-worker-secret" "<value>" --project backend/AppHost
  dotnet user-secrets set "Parameters:tenant-provisioning-secret" "<value>" --project backend/AppHost
  ```

  AppHost passes the same worker secret to the identity provider and the
  assistant, so client-credentials authentication cannot drift between them.

Docker Compose and application Dockerfiles are intentionally absent. This
repository is still a demo without a production deployment design; adding
runtime images is a deployment decision, not a second local-development path
(docs/adr/0029).

### Connect a local database client

Start AppHost, then use these settings in DBeaver, DataGrip, pgAdmin,
TablePlus, or another PostgreSQL client:

| Setting  | Value                          |
| -------- | ------------------------------ |
| Host     | `localhost`                    |
| Port     | `5432`                         |
| Database | `appdb`                        |
| User     | `postgres`                     |
| Password | `postgres`                     |
| SSL      | disabled for local development |

The administrative credentials above are local-demo credentials only. The
application services continue to use the restricted `identity_app` and
`services_app` roles created by `infra/postgres/init/001-service-roles.sh`.

Aspire is local-development orchestration only here. It does not define a
production deployment, but CI exercises the same AppHost resource graph for
the OpenAPI/OIDC runtime smoke instead of maintaining a parallel Compose graph.

## Adding a new backend microservice

Follow `backend/.skills/backend-new-microservice/SKILL.md` — it covers the
full checklist (layout, solution wiring, auth via Admin.Identity.Client,
shared-Postgres schema convention, Aspire, CI, docs). The short
version: copy the five-project layout, mirror identity-service's patterns,
one schema per service in the shared Postgres.

## Adding a new AI service

1. Copy `ai-services/assistant-service/` (pyproject.toml, app/, tests/).
2. Give it its own venv — Python services are NOT part of an npm/dotnet workspace.

## npm workspaces

Root `package.json` declares `apps/*` and `packages/*` as npm workspaces. Only the
JS/TS side is workspace-managed; .NET and Python projects are self-contained and use
their own native tooling (`dotnet`, `pip`/venv).

## Git hooks

Husky lives at the repo root (`.husky/`, installed by the root `prepare`
script). The pre-commit hook runs each workspace's lint-staged from
inside that workspace — add a line to `.husky/pre-commit` when a new
workspace gains a lint-staged config.

## Known gaps (tracked, not blocking)

- `apps/admin-frontend/graphify-out/` is stale (generated before the restructure) —
  regenerate rather than trust it.
- Database bootstrap is opt-in through
  `DatabaseBootstrap:RunOnStartup` (base configuration is `false`;
  Development explicitly enables it). The demo
  assumes at most one bootstrap-enabled instance of each service. A future
  multi-replica deployment must run the migration/seed chain as a one-shot
  bootstrap before starting replicas with startup bootstrap disabled; the
  repository intentionally has no production deployment design yet
  (docs/adr/0025, docs/adr/0027).
- ADR 0028 replaced both EF histories with clean initial baselines. Any local
  database created before that reset is intentionally incompatible. Stop
  AppHost, back up anything worth keeping, and recreate it once with
  `docker volume rm agenza-postgres-data`. The demo has no data migration
  path from the deleted histories.
- `identity_app` owns only the `identity` schema and `services_app` owns only
  the `services` schema. Existing local volumes created before docs/adr/0024
  must be recreated once so Aspire's init script can create the roles and
  grants. Changing either role password also requires recreating the local
  volume because PostgreSQL init files run only on first initialization.
