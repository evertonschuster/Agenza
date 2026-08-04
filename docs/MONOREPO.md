# Monorepo structure

This is the current repository map. Product direction belongs in `VISION.md`;
feature progress belongs in each app's `STATUS.md`.

```text
Agenza/
├── apps/admin-frontend/       React admin UI
├── backend/
│   ├── AdminBackend.slnx      .NET solution
│   ├── AppHost/               canonical local Aspire orchestration
│   ├── ServiceDefaults/       telemetry, health, discovery defaults
│   ├── shared/                narrow identity/CQRS/ASP.NET packages
│   └── services/
│       ├── identity-service/  OIDC, tenants, users, internal clients
│       └── services-service/  catalog offerings context
├── ai-services/
│   └── assistant-service/     authenticated FastAPI boundary; no AI feature yet
├── infra/postgres/init/       local database roles and grants
├── scripts/                   governance, architecture, contract/runtime checks
└── docs/                      cross-cutting living docs and ADR index
```

## Canonical local runtime

```bash
dotnet run --project backend/AppHost --launch-profile http
```

AppHost starts PostgreSQL, identity-service, services-service, the assistant
service, and the admin frontend. It also injects service URLs, connection
strings, internal client credentials, and frontend Vite configuration. Do not
maintain a second Compose-based local runtime.

Fixed local application ports are part of the OIDC redirect/issuer contract:

| Resource | Port |
| --- | ---: |
| identity-service | 5081 |
| services-service | 5080 |
| assistant-service | 8001 |
| admin-frontend | 5173 |
| PostgreSQL | 5432 |

## Local secrets and configuration

`backend/AppHost/AppHost.cs` owns the local resource graph. Its secret
`development-password` parameter is used for the local PostgreSQL resource,
restricted application roles, and internal OAuth clients. Override it through
AppHost user secrets when the demo default is unsuitable:

```bash
dotnet user-secrets set "Parameters:development-password" "<value>" --project backend/AppHost
```

Do not add real secrets to tracked appsettings or `.env` files. Frontend
`VITE_*` values are public browser configuration, not secrets. The assistant
service's `IDENTITY_CLIENT_SECRET` is server-side and is injected by AppHost.

PostgreSQL initialization runs only for a new volume. Changing role passwords
or adopting schema/role changes may require recreating the disposable local
volume:

```bash
docker volume rm agenza-postgres-data
```

## Ownership rules

- Each backend service owns one schema, migrations-history table, role, and
  write boundary.
- Cross-service communication uses HTTP with identity-service tokens; no shared
  table writes or internal project references.
- Python services validate the same identity authority and never access another
  service's database.
- npm workspaces manage only `apps/*` and future `packages/*`; .NET and Python
  use their native package/lock tooling.

## Adding code

- New backend vertical: use `agenza-backend-use-case` in the owning service.
- New backend context: justify it first, then use `agenza-backend-new-service`.
- New AI service: start from the current assistant-service tooling and define a
  concrete use case before scaffolding model/provider abstractions.
- New frontend app/package: add only for a current requirement, not to realize a
  planned entry from `VISION.md` early.

## Known deployment gaps

Agenza currently has no production deployment design. Aspire is local
orchestration and CI runtime-smoke infrastructure, not a production topology.
Database bootstrap is suitable for the current single-instance demo; a future
multi-replica deployment must move migration/seed execution to an explicit
one-shot step. ADR 0028 reset pre-deployment migration histories, so old local
volumes are intentionally disposable rather than supported by a data-upgrade
path.
