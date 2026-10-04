# Backend — .NET services

Solution: `AdminBackend.slnx` (the XML solution format). Toolchain and package versions are pinned in
`global.json`, `Directory.Packages.props` and `.config/dotnet-tools.json`.

| Read | For |
| --- | --- |
| [`AGENTS.md`](AGENTS.md) | the rules that break build or review, and where to start |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | how a service and a feature are built, and why; which code is the reference |
| [`../docs/API.md`](../docs/API.md) | request/response conventions at the HTTP boundary, verified against the running service |
| [`../docs/adr/README.md`](../docs/adr/README.md) | the decisions, current and superseded |

## Layout

```
services/<service>/
├── <Service>.Domain/            entities, value objects — no references
├── <Service>.Application/       use cases as vertical slices, ports — → Domain
├── <Service>.Infrastructure/    EF Core, repositories, adapters — → Application
├── <Service>.Api/               ASP.NET Core controllers — → Application + Infrastructure
├── <Service>.Tests/             unit tests of Domain + Application
└── <Service>.PersistenceTests/  EF InMemory tenant tests, where a service needs them
shared/                          cross-cutting infrastructure — never business rules
AppHost/                         .NET Aspire, local orchestration only
ServiceDefaults/                 OpenTelemetry, health checks, service discovery
```

Each service is one business context with its own schema and database role. The project-reference
rules and the shared packages are described in [ARCHITECTURE §1](docs/ARCHITECTURE.md#1-shape).

## Commands

```bash
dotnet tool restore
dotnet build AdminBackend.slnx
dotnet test AdminBackend.slnx
dotnet run --project AppHost --launch-profile http
```

`dotnet test` runs the unit tests with the same coverage gate as CI, plus the EF InMemory persistence
tests. The full stack (PostgreSQL, both services, the frontend, the AI service) starts through Aspire
only — see [`../docs/MONOREPO.md`](../docs/MONOREPO.md). Gates and what each one measures:
[`../docs/QUALITY.md`](../docs/QUALITY.md).
