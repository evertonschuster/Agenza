# Quality gates & CI

Every tool in this stack is free for public repositories. Nothing here
requires a paid plan.

## Workflows (`.github/workflows/`)

| Workflow               | Triggers on                   | What it gates                                                                                           |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `frontend-ci.yml`      | frontend/backend API surfaces | Prettier, ESLint, tsc/Vite, Vitest coverage, Playwright, generated OpenAPI drift, real OIDC scope smoke |
| `backend-ci.yml`       | `backend/**`                  | warning-free build, unit coverage, and Docker-free EF tenant persistence tests                          |
| `ai-services-ci.yml`   | `ai-services/**`              | Locked Python 3.12 deps, Ruff, pytest coverage, and Aspire-equivalent Uvicorn `/health` smoke           |
| `codeql.yml`           | all PRs/pushes + weekly cron  | Static security analysis (C#, TS/JS, Python)                                                            |
| `sonar.yml`            | all PRs/pushes                | SonarQube Cloud analysis for all three stacks (skips until `SONAR_TOKEN` exists)                        |
| `agent-governance.yml` | all PRs/pushes                | AI agent governance framework consistency — see [docs/AGENT-GOVERNANCE.md](AGENT-GOVERNANCE.md)         |

Dependabot (`.github/dependabot.yml`) opens weekly grouped PRs for npm,
NuGet, pip, and the workflows' actions.

## What each coverage gate actually measures — read before trusting a number

- **Frontend**: `coverage.include: ['src/**']` in `vitest.config.ts` means
  every source file counts, including files no test imports. Excluded:
  declarative wiring (`main.tsx`, `App.tsx`, the route table) and the
  stub pages listed explicitly in the config — remove a stub from that
  list when its feature vertical is implemented.
- **Backend unit coverage**: `*.Tests`, configured in
  `backend/Directory.Build.props` + `.targets`. Coverlet instruments the
  assemblies each project references — **Domain + Application** —
  gated at 80% line coverage. `Admin.SharedKernel` is excluded from
  every _consuming_ service's gate (`Directory.Build.targets`) since it
  has its own dedicated project (`Admin.SharedKernel.Tests`) and gate —
  counting it twice would let one hide behind the other's number
  (docs/adr/0005). `ServicesService.PersistenceTests` covers EF tenant
  assignment and filtering in memory (docs/adr/0019). There is no
  Testcontainers/`WebApplicationFactory` project. The frontend
  API-contract workflow starts the AppHost resource graph, applies the
  migration chain to Aspire's PostgreSQL resource, and runs the real OIDC
  smoke defined in `scripts/smoke_oidc_contract.py` (docs/adr/0026,
  docs/adr/0029).
- **AI services**: `--cov=app` in `pyproject.toml` measures the whole
  package, gate at 80% (`--cov-fail-under=80`).

## SonarQube Cloud setup (one-time, ~10 minutes)

1. Sign in at <https://sonarcloud.io> with GitHub and import `Agenza`.
2. Create three projects (monorepo mode): `agenza-frontend`,
   `agenza-backend`, `agenza-ai-services` under organization
   `evertonschuster`. If you choose different keys, update
   `.github/workflows/sonar.yml`.
3. For each project: **Administration → Analysis Method → disable
   Automatic Analysis** (it conflicts with CI-based analysis).
4. Generate a token (My Account → Security) and add it as the
   `SONAR_TOKEN` repository secret on GitHub.
5. Optional: set the quality gate to "Sonar way" and require it in
   branch protection once it's been green for a few PRs.

Until step 4 happens, `sonar.yml` skips itself — it never blocks a PR.

## AI code review (free options)

- **CodeRabbit** — already reviewing PRs here; the Pro plan is free for
  public/open-source repositories.
- **CodeQL** — security-focused review on every PR (already enabled).
- **Claude Code** (`/install-github-app`) — adds `@claude` mention-driven
  review/fix on PRs; usage is billed against an Anthropic API key, so
  keep it for high-value reviews if the budget is tight.

## Branch protection recommendation

Require these checks on `main`: `frontend-build-and-test`,
`backend-build-and-test`, `ai-services-build-and-test`, `agent-governance`,
the CodeQL languages, and (after setup) the Sonar quality gate. All jobs
already have stable, unique names for this purpose.
