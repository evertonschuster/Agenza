# ADR 0004 — Free-tier quality stack

Status: accepted (2026-07)

## Context

We want enforced quality (coverage, static analysis, security scanning,
AI review) without paid tooling. The repo is public on GitHub, which
unlocks the open-source tier of several commercial tools.

## Decision

| Concern             | Tool                                   | Cost basis                    |
| ------------------- | -------------------------------------- | ----------------------------- |
| Coverage gates ≥80% | coverlet (.NET), Vitest v8 (TS), pytest-cov (Py) | OSS               |
| Lint/format         | ESLint+Prettier (TS), Ruff (Py)        | OSS                           |
| .NET test assertions | AwesomeAssertions                      | OSS (Apache 2.0, permanent - see docs/adr/0005 on why not FluentAssertions v8+) |
| .NET validation     | FluentValidation                       | OSS (Apache 2.0)              |
| .NET API versioning | Asp.Versioning.Mvc                     | OSS (MIT, .NET Foundation)    |
| Security SAST       | CodeQL                                 | Free for public repos         |
| Code quality/smells | SonarQube Cloud (3 monorepo projects)  | Free for public repos         |
| AI code review      | CodeRabbit                             | Pro free for public repos     |
| Dependency updates  | Dependabot (npm/nuget/pip/docker/actions) | Free                       |

Coverage-gate scope per stack is documented in `docs/QUALITY.md` — the
number a gate enforces is only meaningful if you know what it measures.

## Consequences

- If the repo ever goes private, SonarQube Cloud and CodeRabbit lose
  their free tier — revisit this ADR (options: self-hosted SonarQube
  Community Build, Gemini Code Assist, or paying).
- Multiple overlapping analyzers (CodeQL + Sonar + CodeRabbit) are
  accepted: they catch different classes of problems and are all free.
