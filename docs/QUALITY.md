# Quality gates & CI

This document describes executable quality gates. Provider plans, pricing, and
optional review assistants are deliberately excluded because they change
independently of repository correctness.

## Workflows (`.github/workflows/`)

| Workflow             | Triggers on                   | What it gates                                                                                           |
| -------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------- |
| `frontend-ci.yml`    | frontend/backend API surfaces | Prettier, ESLint, tsc/Vite, Vitest coverage, Playwright, generated OpenAPI drift, real OIDC scope smoke |
| `backend-ci.yml`     | `backend/**`                  | warning-free build, unit coverage, and Docker-free EF tenant persistence tests                          |
| `ai-services-ci.yml` | `ai-services/**`              | Locked Python deps, Ruff, pytest coverage, and Aspire-equivalent Uvicorn `/health` smoke                |
| `codeql.yml`         | all PRs/pushes + weekly cron  | Static security analysis (C#, TS/JS, Python)                                                            |
| `sonar.yml`          | all PRs/pushes                | SonarQube Cloud analysis for all three stacks (skips until `SONAR_TOKEN` exists)                        |
| `docs-ci.yml`        | all PRs/pushes to main        | Documentation checker tests, local destinations, current ADR references and Agenza skill metadata       |

Dependabot (`.github/dependabot.yml`) opens weekly grouped PRs for npm,
NuGet, pip, and the workflows' actions.

## Documentation references

Run `npm run check:docs` from the repository root; the checker uses only Node built-ins.
Its tests run with `node --test scripts/checkDocs.test.mjs`.

The checked corpus is declared in [checkDocs.mjs](../scripts/checkDocs.mjs): root and area entries,
current README/architecture/API/quality/product guides, the frontend constitution, the ADR index,
and Markdown under canonical `.claude/skills/agenza-*` directories. It verifies local inline/image
links and reference definitions, standalone `@path` imports in CLAUDE wrappers, required skill
`name`/`description` text, and ADR IDs in the index's current-decision column.
Targets may be files or directories; a file fragment checks the file's existence only.

This is a small reference checker, not a complete Markdown or YAML parser. It supports bracket
links with balanced labels, bare or angle-delimited destinations, and reference definitions whose
destination is on the same or immediately following line. Escaped opening brackets stay literal;
escaped table pipes do not shift the current ADR column. Destination escapes, the named entities
amp/lt/gt/quot/apos and decimal/hexadecimal character references decode once, before URL decoding.
Other named entities produce an explicit unsupported-format error; use Unicode or percent-encoding.
Required frontmatter fields accept flat quoted/plain or indented block scalars; single-line
double-quoted values support YAML character escapes, including x/u/U hexadecimal forms.
It ignores fenced code (including blockquotes), paragraph-bounded inline code, HTML comments, URI
schemes, isolated fragments/queries and template placeholders. It does not validate anchors,
HTML links, indented code blocks, symbols, external URLs, shell commands, semantic agreement or
tool discovery. Historical ADR bodies/specs and generated Spec Kit adapters are outside the scan;
their linked destinations are still checked when referenced from the active corpus.

The stable `docs-checks` job runs on every PR and push to main, including changes that remove a
code file referenced by a guide. It installs no packages and starts no application or database.

## What each coverage gate actually measures — read before trusting a number

- **Frontend**: [vitest.config.ts](../apps/admin-frontend/vitest.config.ts) defines
  included files, explicit exclusions and thresholds. The include pattern counts
  source files even when no test imports them; only configured exclusions are
  removed from the denominator. Review exclusions when a file's responsibility changes.
- **Backend unit coverage**: `*.Tests`, configured in
  `backend/Directory.Build.props` + `.targets`. Coverlet instruments the
  assemblies each project references — **Domain + Application** —
  gated at 80% line coverage. `Admin.SharedKernel` is excluded from
  every _consuming_ service's gate (`Directory.Build.targets`) since it
  has its own dedicated project (`Admin.SharedKernel.Tests`) and gate, and
  so does `Admin.Logging` (`Admin.Logging.Tests`, which never counts
  toward a service's gate because no service test project references it) —
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

The backend's [current guarantee matrix](../backend/docs/ARCHITECTURE.md#11-what-enforces-what)
identifies each mechanism and its limits. Line coverage, type drift, runtime smokes and PostgreSQL
verification exercise different properties; none proves the complete behavior of the others.

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

## Agent compatibility

Repository correctness does not depend on which coding agent produced a
change. CI is the independent acceptance boundary regardless of tooling.

## Branch protection recommendation

Require these checks on `main`: `frontend-build-and-test`,
`backend-build-and-test`, `ai-services-build-and-test`,
the CodeQL languages, and (after setup) the Sonar quality gate. All jobs
already have stable, unique names for this purpose.
