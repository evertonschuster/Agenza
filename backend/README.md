# Backend — .NET services

Use the [solution](AdminBackend.slnx) and repository pins:
[SDK](global.json), [packages](Directory.Packages.props) and
[local tools](.config/dotnet-tools.json).

| Reference                            | Purpose                                                                                |
| ------------------------------------ | -------------------------------------------------------------------------------------- |
| [AGENTS.md](AGENTS.md)               | Task routing and critical invariants                                                   |
| [Architecture](docs/ARCHITECTURE.md) | Current rules, reference implementations and known limits                              |
| [HTTP conventions](../docs/API.md)   | Boundary conventions; check the controller and OpenAPI for an endpoint's current shape |
| [ADR index](../docs/adr/README.md)   | Decisions and their evolution                                                          |
| [Quality gates](../docs/QUALITY.md)  | What the checks measure                                                                |

## Commands

Run from `backend/`:

```powershell
dotnet tool restore
dotnet build AdminBackend.slnx -c Release
dotnet test AdminBackend.slnx -c Release
dotnet run --project AppHost --launch-profile http
```

The AppHost is the local stack entry point; preparation is in
[MONOREPO](../docs/MONOREPO.md). It orchestrates the database, services and frontend through Aspire.

Build and test settings are in [Directory.Build.props](Directory.Build.props),
[Directory.Build.targets](Directory.Build.targets) and the
[backend workflow](../.github/workflows/backend-ci.yml). The unit-test coverage gate also applies
locally; EF InMemory persistence tests cover selected tenant behaviors, not PostgreSQL enforcement.
Use [architecture §9](docs/ARCHITECTURE.md#9-tests) to select the appropriate verification tier.

For an exclusively documentary change, compare the relevant source, check links and formatting,
and review the diff. Do not treat a local command not executed as a passing result.
