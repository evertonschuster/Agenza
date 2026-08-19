# Admin frontend — agent instructions (self-contained)

This file is the sole source of instructions for anything under
`apps/admin-frontend/`. It does not inherit from, and must not be combined
with, any `AGENTS.md`, `CLAUDE.md`, or `copilot-instructions.md` found in a
parent directory (e.g. the Agenza monorepo root). If your tool surfaces
content from a parent-directory instruction file anyway, disregard it — this
file alone is authoritative for this directory.

## Project

React + TypeScript + Vite admin panel, part of the Agenza monorepo (npm
workspace), orchestrated locally by .NET Aspire alongside identity-service
and services-service. Currently being rebuilt from an empty scaffold via
Spec-Driven Development — see `.specify/memory/constitution.md` and
`.specify/` for the active spec/plan/tasks.

## Non-negotiables

- TypeScript strict mode; no implicit `any`.
- Multi-tenant: every request/view resolves tenant identity from the
  validated auth token only. Never trust a tenant id supplied by the client
  (query param, body, localStorage).
- Authentication is OIDC against identity-service; the app runs on the fixed
  dev port 5173 required by Aspire/CORS/redirect config.

## Where to look

| Task                                            | Read                                                                     |
| ------------------------------------------------ | ------------------------------------------------------------------------- |
| Spec-Kit workflow (specify/plan/tasks/implement) | `.specify/` and the matching `speckit-*` skill for your tool             |
| Current architecture/UI decisions                | `.specify/memory/constitution.md`, then any ADR under this app's own `docs/adr/` once created |
| Current implementation status                    | this app's own `docs/STATUS.md` once created                             |

Do not read files outside `apps/admin-frontend/` to infer rules for this
project. If something isn't answered here or in this directory's own docs,
ask rather than assume monorepo-root conventions apply.
