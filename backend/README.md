# Backend

.NET context-aggregated services orchestrated locally by Aspire. The solution is
`AdminBackend.slnx`.

## Structure

Each business service owns its domain, application, infrastructure, API,
schema, migrations, and tests:

```text
services/<service-name>/
├── <Service>.Domain/
├── <Service>.Application/
├── <Service>.Infrastructure/
├── <Service>.Api/
├── <Service>.Tests/
└── <Service>.PersistenceTests/   when tenant/persistence security needs it
```

Shared packages have narrow responsibilities under `shared/`. Follow
[AGENTS.md](AGENTS.md) and the relevant canonical skill instead of copying a
service tree from documentation.

## Commands

```bash
dotnet tool restore
dotnet build AdminBackend.slnx
dotnet test AdminBackend.slnx

# Canonical full local runtime, from the repository root
dotnet run --project backend/AppHost --launch-profile http
```

Coverage, persistence tests, OpenAPI generation, and OIDC runtime smoke behavior
are documented in [../docs/QUALITY.md](../docs/QUALITY.md). Current service
ownership and known runtime gaps are documented in
[../docs/MONOREPO.md](../docs/MONOREPO.md).
