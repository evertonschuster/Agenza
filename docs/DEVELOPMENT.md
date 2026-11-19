# Development and quality gates

Where each area lives is in the [root AGENTS](../AGENTS.md#where-things-are); each app or
service keeps its own docs in its folder.

## Local development

One command starts the whole stack:

```bash
dotnet run --project backend/AppHost --launch-profile http
```

Aspire starts the frontend, both .NET services, assistant-service and PostgreSQL, and prints its
dashboard URL (logs, traces, health, resource controls). Application ports are fixed at
5081/5080/8001/5173 because the OIDC issuer, redirects and CORS origin use them. PostgreSQL is fixed
at 5432 and persists in the `agenza-postgres-data` volume.

- Docker is needed only as Aspire's container runtime. Node, Python and `uv` must be installed;
  AppHost runs `npm` and a locked `uv sync` before starting Vite and Uvicorn.
- `dotnet run` hands the AppHost to the Aspire CLI, which launches the Debug build. The first build
  fetches the CLI, dashboard and DCP into `~/.aspire` through `dotnet dnx`, so it needs network but
  no separate install ([decisions/processo.md](decisions/processo.md)).
- One local-development password, `postgres`, is shared by PostgreSQL, the restricted application
  roles and the internal OAuth clients. AppHost passes it as a fixed value, so configuration does
  not override it.
- PostgreSQL init files run only on the volume's first initialization. After changing that password
  or the scripts in `infra/postgres/init/`, stop AppHost and recreate the volume once with
  `docker volume rm agenza-postgres-data`. `identity_app` and `services_app` keep separate schema
  permissions even with equal local passwords.
- Database bootstrap runs on startup only where `DatabaseBootstrap:RunOnStartup` is true
  (Development). A multi-replica deployment would need a one-shot bootstrap first
  ([decisions/plataforma.md](decisions/plataforma.md)).

There is no Docker Compose and no application Dockerfile: Aspire is the only local orchestration,
and CI exercises the same AppHost graph ([decisions/plataforma.md](decisions/plataforma.md)).

### Database client

| Setting  | Value                          |
| -------- | ------------------------------ |
| Host     | `localhost`                    |
| Port     | `5432`                         |
| Database | `appdb`                        |
| User     | `postgres`                     |
| Password | `postgres`                     |
| SSL      | disabled for local development |

These are local-demo administrative credentials; the services use the restricted roles created by
`infra/postgres/init/001-service-roles.sh`.

## Adding a service

Usually you don't: a capability that fits an existing business context is a feature inside that
service. A new context that justifies a service is a recorded decision; follow
[backend/docs/ARCHITECTURE.md §1](../backend/docs/ARCHITECTURE.md#1-shape) and use the live services,
central package file, solution and AppHost as references. A new AI service copies
`ai-services/assistant-service/` with its own venv.

The root `package.json` declares `apps/*` and `packages/*` as npm workspaces; .NET and Python
projects use their own tooling.

## Quality gates

No local Git hooks are installed. Run the applicable format, lint, build and test commands before
committing; the required GitHub Actions checks gate `main`, whatever agent produced the change.

| Workflow             | Triggers on                   | What it gates                                                                                                    |
| -------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `frontend-ci.yml`    | frontend/backend API surfaces | Prettier, ESLint, tsc/Vite, Vitest coverage, Playwright, generated OpenAPI drift, real OIDC and tenant isolation |
| `backend-ci.yml`     | `backend/**`                  | Warning-free build, unit coverage and Docker-free EF persistence tests                                           |
| `ai-services-ci.yml` | `ai-services/**`              | Locked Python deps, Ruff, pytest coverage and a Uvicorn `/health` smoke                                          |
| `codeql.yml`         | all PRs/pushes + weekly cron  | Static security analysis (C#, TS/JS, Python)                                                                     |
| `sonar.yml`          | all PRs/pushes                | SonarQube Cloud analysis for the three stacks (skips until `SONAR_TOKEN` exists)                                 |
| `docs-ci.yml`        | all PRs/pushes to main        | `npm run check:docs` and its tests: links, CLAUDE imports, skill table and frontmatter                           |

Dependabot opens weekly grouped PRs for npm, NuGet, pip and the workflows' actions.

### What coverage measures

- **Frontend:** [vitest.config.ts](../apps/admin-frontend/vitest.config.ts) defines included files,
  exclusions and thresholds. Files count even when no test imports them; review exclusions when a
  file's responsibility changes.
- **Backend:** `*.Tests` measure Domain + Application at 80% lines (`Directory.Build.props` and
  `.targets`). `Admin.SharedKernel` and `Admin.Logging` have their own test projects and gates and
  are excluded from each service's number, so one cannot hide behind the other.
  `ServicesService.PersistenceTests` cover EF tenant assignment, filtering and tag-deletion
  relationship coverage in memory ([decisions/processo.md](decisions/processo.md),
  [decisions/backend.md](decisions/backend.md)). There is no Testcontainers or
  `WebApplicationFactory` project: the frontend API-contract job starts AppHost, applies the
  migrations and runs the real OIDC and tenant-isolation checks; its HTTP scenario needs
  `AGENZA_DISPOSABLE_TEST_DB=1` and `AGENZA_TENANT_PROVISIONING_SECRET`.
- **AI services:** `--cov=app` measures the whole package, gated at 80%.

Line coverage, type drift, runtime smokes and PostgreSQL checks prove different properties; the
backend's [guarantee matrix](../backend/docs/ARCHITECTURE.md#11-what-enforces-what) lists each one
and its limits.

### SonarQube Cloud (one-time setup)

1. Sign in at <https://sonarcloud.io> with GitHub and import `Agenza`.
2. Create three projects (monorepo mode) under organization `evertonschuster`: `agenza-frontend`,
   `agenza-backend`, `agenza-ai-services`. Other keys require updating `.github/workflows/sonar.yml`.
3. In each project, disable Automatic Analysis (it conflicts with CI analysis).
4. Add a token (My Account → Security) as the `SONAR_TOKEN` repository secret.

Until step 4, `sonar.yml` skips itself.

### Branch protection

Require on `main`: `frontend-build-and-test`, `backend-build-and-test`,
`ai-services-build-and-test`, the CodeQL languages and, after setup, the Sonar quality gate.
