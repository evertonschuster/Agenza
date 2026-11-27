# Agenza

Multi-tenant SaaS for small service businesses in Brazil (clinics, beauty, massage, salons):
scheduling, client management and an AI receptionist.

## Quick start

From the repository root, with Docker running:

```bash
dotnet run --project backend/AppHost --launch-profile http
```

Aspire starts PostgreSQL, the .NET services, the AI service and the frontend, and prints its
dashboard URL. Prerequisites, ports, the database client and the quality gates are in
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md); the demo login is in the
[frontend README](apps/admin-frontend/README.md).

## Where things are

The map of the repository, the rules that apply everywhere and how each coding agent reaches them
are in [AGENTS.md](AGENTS.md); each area has its own `AGENTS.md` or `README.md`. Tool versions come
from the pins (`.nvmrc`, `packageManager`, `backend/global.json`, `.python-version`, `uv.lock`), not
from documentation.

[`.mcp.json`](.mcp.json) declares optional MCP servers (GitHub, shadcn, Playwright, Chrome DevTools);
none is required for development.

Production server folders, releases, secrets and service locations are documented in
[docs/PRODUCTION.md](docs/PRODUCTION.md).
