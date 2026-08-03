# ADR 0032 — Stable runtime upgrades and compatibility pins

Status: accepted (2026-08)

## Context

The repository-wide dependency refresh moved each supported runtime to the
newest stable release available without previews: Node 26.5.1, npm 12.0.2,
.NET SDK 10.0.302, Python 3.14.6, and uv 0.11.32.

Two nominally newer packages do not yet compose with those stable runtime
lines:

- TypeScript 7.0.2 produces unresolved error types under the latest
  typescript-eslint 8.65.0, causing the typed lint gate to fail.
- Microsoft.OpenApi 3.9.0 is incompatible with the ASP.NET Core 10.0.10
  OpenAPI source generator, which tries to assign a now read-only
  `IOpenApiMediaType.Example` property.

npm 12 also hoists Vitest and React-dependent packages to the workspace root.
Their optional peers must be available there, and Node 26's experimental
global web storage must not shadow jsdom inside test workers.

## Decision

- Use TypeScript 5.9.3 in both the frontend manifest and root override until
  the stable typescript-eslint line supports TypeScript 7 with every typed
  lint rule enabled.
- Use Microsoft.OpenApi 2.11.0 until the stable ASP.NET Core OpenAPI source
  generator supports Microsoft.OpenApi 3.
- Declare `@types/react`, `@types/react-dom`, and `jsdom` at the workspace
  root as well as in the frontend workspace so npm 12's hoisted tools can
  resolve their peers deterministically.
- Disable Node's experimental native web-storage global in Vitest workers so
  the configured jsdom environment owns `localStorage`.
- Do not use preview runtimes or packages merely to remove an outdated-report
  entry.

## Consequences

`npm outdated` continues to report TypeScript 7 and
`dotnet package list --outdated` continues to report Microsoft.OpenApi 3.
Those two entries are expected, not overlooked updates. Each pin can be
removed only after a clean install passes the repository's full lint, build,
test, coverage, and Aspire smoke gates on the newer stable line.
