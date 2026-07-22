# Quality gates & CI

Every tool in this stack is free for public repositories. Nothing here
requires a paid plan.

## Workflows (`.github/workflows/`)

| Workflow             | Triggers on                    | What it gates                                                     |
| -------------------- | ------------------------------ | ----------------------------------------------------------------- |
| `frontend-ci.yml`    | `apps/**`, `packages/**`       | Prettier check, ESLint (incl. architecture rules), tsc build, Vitest with 80% line-coverage gate |
| `backend-ci.yml`     | `backend/**`                   | `dotnet build` + `dotnet test` with 80% line-coverage gate (coverlet) |
| `ai-services-ci.yml` | `ai-services/**`               | Ruff lint + format check, pytest with 80% coverage gate (pytest-cov) |
| `codeql.yml`         | all PRs/pushes + weekly cron   | Static security analysis (C#, TS/JS, Python)                       |
| `sonar.yml`          | all PRs/pushes                 | SonarQube Cloud analysis for all three stacks (skips until `SONAR_TOKEN` exists) |
| `agent-governance.yml` | all PRs/pushes               | AI agent governance framework consistency — see [docs/AGENT-GOVERNANCE.md](AGENT-GOVERNANCE.md) |

Dependabot (`.github/dependabot.yml`) opens weekly grouped PRs for npm,
NuGet, pip, Docker base images, and the workflows' actions.

## What each coverage gate actually measures — read before trusting a number

- **Frontend**: `coverage.include: ['src/**']` in `vitest.config.ts` means
  every source file counts, including files no test imports. Excluded:
  declarative wiring (`main.tsx`, `App.tsx`, the route table) and the
  stub pages listed explicitly in the config — remove a stub from that
  list when its feature vertical is implemented.
- **Backend**: unit tests only (`*.Tests`), configured in
  `backend/Directory.Build.props` + `.targets`. Coverlet instruments the
  assemblies each project references — **Domain + Application** —
  gated at 80% line coverage. `Admin.SharedKernel` is excluded from
  every *consuming* service's gate (`Directory.Build.targets`) since it
  has its own dedicated project (`Admin.SharedKernel.Tests`) and gate —
  counting it twice would let one hide behind the other's number
  (docs/adr/0005). There are no integration tests (docs/adr/0015) — CI
  never needs Docker or a database; Api/Infrastructure have no
  automated coverage.
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
`backend-build-and-test`, `ai-services-build-and-test`, the CodeQL
languages, and (after setup) the Sonar quality gate. All jobs already
have stable, unique names for this purpose.
