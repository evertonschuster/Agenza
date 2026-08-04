---
name: agenza-backend-new-service
description: >
  Use when deciding whether a capability needs a new .NET service or when
  creating one under backend/services. Covers context ownership, project
  boundaries, packages, tenant-safe persistence, auth, Aspire, tests, and docs.
---

# Backend new service

Create a service only for a genuinely new business context. Otherwise add a
vertical slice to the existing owner with `agenza-backend-use-case`.

Inspect the live services, AppHost, solution, central package file, and CI.
Never copy versioned project templates from prose.

## Required shape

- Domain, Application, Infrastructure, Api, and Tests projects in the solution.
- PersistenceTests when tenant-scoped EF behavior or another security-critical
  persistence boundary cannot be proven by unit tests.
- Inward project references matching `backend/AGENTS.md`.
- Central package versions in `Directory.Packages.props`; project references
  remain versionless.
- Assembly-scanned handlers/validators and a service-local unit-of-work boundary.

## Runtime and security

- Resource services use `Admin.Identity.Client`, default authorization, and
  `TenantHeaderFilter`; `[IgnoreTenant]` is exceptional and reviewed.
- Save interceptors assign tenants; handlers never accept or set arbitrary
  tenant ids.
- The service owns one schema, migrations history, role, and write boundary.
- Register audience/scope/client behavior in identity-service as required.
- Wire the service and dependencies into AppHost. Do not add a parallel local
  Compose/Dockerfile runtime.

Update `docs/MONOREPO.md` and `docs/VISION.md`, then run backend, governance,
contract, migration, and runtime gates that apply.
