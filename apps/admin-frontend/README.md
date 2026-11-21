# admin-frontend

Agenza's admin panel. This README covers the frontend's environment and operation; the
[architecture guide](docs/ARCHITECTURE.md) describes the current design.

## Prerequisites

Versions come from the executable sources: [Node](../../.nvmrc), `packageManager` in the
[root package.json](../../package.json) and the [.NET SDK](../../backend/global.json). Docker is
needed for the PostgreSQL that Aspire manages. Compatibility pins follow
[decisions/process.md](../../docs/decisions/process.md).

## Running the stack

From the monorepo root, install the locked dependencies and start the AppHost:

```powershell
nvm use
npm ci
dotnet run --project backend/AppHost --launch-profile http
```

The Aspire dashboard lists the resources and their addresses. The frontend uses
`http://localhost:5173` and identity-service `https://localhost:7081`; these ports match the OIDC
redirects registered for the local environment, so changing them means aligning the AppHost and the
registered client.

The demo login is `owner@demo.local` / `Passw0rd!`, created by the local seed.

### Environment variables

The [AppHost](../../backend/AppHost/AppHost.cs) injects the variables required by
[shared/env.ts](src/shared/env.ts); [.env.example](.env.example) is the reference. Aspire is the
normal path; a Vite started on its own needs the same environment.

| Variable                             | Role                     |
| ------------------------------------ | ------------------------ |
| `VITE_API_BASE_URL`                  | services-service         |
| `VITE_OIDC_AUTHORITY`                | identity-service         |
| `VITE_OIDC_CLIENT_ID`                | OIDC client              |
| `VITE_OIDC_REDIRECT_URI`             | code-flow callback       |
| `VITE_OIDC_POST_LOGOUT_REDIRECT_URI` | destination after logout |
| `VITE_OIDC_SCOPE`                    | requested scopes         |

Do not add defaults that hide a missing setting. Changing an endpoint, client, redirect or scope
means aligning the AppHost, `loadEnv` and the client registration in identity-service.

## Commands

Run them in this app's folder; [package.json](package.json) is the executable list.

| Command                            | Purpose                                         |
| ---------------------------------- | ----------------------------------------------- |
| `npm run dev`                      | Vite, with the injected environment             |
| `npm run build`                    | TypeScript and production build                 |
| `npm run lint`                     | ESLint                                          |
| `npm run format` / `format:check`  | Prettier                                        |
| `npm run test`                     | Vitest                                          |
| `npm run test:coverage`            | Vitest with the coverage gates                  |
| `npm run test:e2e`                 | Playwright against the real stack               |
| `npm run generate:api-types`       | OpenAPI types from the running services-service |
| `npm run generate:api-types:check` | Temporary regeneration and comparison of types  |

To reproduce the static and component validation:

```powershell
npm run format:check
npm run lint
npm run build
npm run test:coverage
```

Playwright and the type check need the Aspire stack. The
[workflow](../../.github/workflows/frontend-ci.yml) defines what CI runs, and
[DEVELOPMENT](../../docs/DEVELOPMENT.md) explains what each gate covers.

## Lockfile

When adding or updating dependencies, keep the root `package-lock.json` with the optional native
variants the Linux CI needs. The maintenance procedure uses a Linux image with a fixed digest and an
explicit npm. Run from the monorepo root:

```powershell
docker run --rm -v "${PWD}:/w" -w /w node:22.23.2@sha256:8a34c4ab3ea2c5cd194f07e317b2a8f09461d3c8b05c4e34c8ccd56d56024c4d sh -c "npm install -g npm@12.0.2 && npm install --package-lock-only --ignore-scripts --allow-remote=all"
```

The explicit npm avoids the image's bundled npm failing to resolve this graph; the fetch flag records
the other platforms' variants. The image is a regeneration tool; the runtime version stays in
`.nvmrc`. The digest needs a deliberate update, since it gets no automatic patches. Review the
lockfile diff and check `npm ci` in CI before merging. This maintenance container does not change
the local orchestration through Aspire.

## Workflow

The [root instructions](../../AGENTS.md#workflow) define planning and the PR flow; the
current behavior lives in the code and tests. The [app AGENTS](AGENTS.md) routes each task to its
guide section (the skills are routed from the root AGENTS), [CLAUDE.md](CLAUDE.md) keeps the shared imports, and the optional MCP
integrations are in [.mcp.json](../../.mcp.json).
