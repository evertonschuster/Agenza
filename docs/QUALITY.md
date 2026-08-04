# Quality gates and CI

Executable workflow files and package/project configuration are the source of
truth. This document explains what the gates protect without copying volatile
versions, test counts, or provider setup walkthroughs.

## Workflows

| Workflow | Primary coverage |
| --- | --- |
| `frontend-ci.yml` | format, lint, build, Vitest coverage, Playwright, generated OpenAPI drift, OIDC/API smoke |
| `backend-ci.yml` | warning-free build, unit coverage, narrow EF tenant persistence tests |
| `ai-services-ci.yml` | locked Python dependencies, Ruff, pytest coverage, health smoke |
| `codeql.yml` | C#, TypeScript/JavaScript, and Python security analysis |
| `sonar.yml` | optional SonarCloud analysis; skips until `SONAR_TOKEN` exists |
| `agent-governance.yml` | skill sync, instruction consistency, architecture guards, guard tests |

Dependabot manages grouped npm, NuGet, pip, and GitHub Actions updates.

## Coverage boundaries

- **Frontend:** `vitest.config.ts` defines included/excluded source. Remove a
  stub-page exclusion when that route becomes a real vertical.
- **Backend:** `Directory.Build.props`/`.targets` define the 80% Domain and
  Application unit gate. Shared-kernel code has its own test project. Narrow
  PersistenceTests verify tenant-critical EF behavior; runtime OpenAPI/OIDC
  smoke is a separate boundary.
- **AI services:** `pyproject.toml` defines whole-`app` pytest coverage and the
  threshold.

A clean-database contract smoke does not prove that a destructive migration is
safe for existing data. Migration review follows the migration-safety skill.

## Optional external analysis

SonarCloud project identifiers live in `.github/workflows/sonar.yml`; the token
lives only in the GitHub repository secret `SONAR_TOKEN`. Provider account,
organization, plan, and branch-protection settings are repository administration
state, not agent instructions. Update the workflow only when the configured
project keys change.

## Acceptance

Run the commands listed by the affected `AGENTS.md`. CI remains the independent
integration boundary regardless of which coding agent or IDE produced a change.
Do not lower coverage, disable a check, skip a test, or expand an allowlist merely
to pass.
