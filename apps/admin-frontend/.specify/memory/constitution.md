<!--
Sync Impact Report
Version: 1.0.0 → 1.0.1 (clarification, 2026-10-27).
Clarifies generated OpenAPI types plus the authored client/facade, corrects the ADR 0039 link,
and replaces scaffold-era status with references to current decisions. No principle or CI gate
is relaxed. Templates are unchanged in P1; proportional artifact generation belongs to P4.
-->

# Agenza Admin Frontend Constitution

## Core Principles

### I. Strict TypeScript

TypeScript MUST remain strict. Do not weaken the configuration or introduce implicit any.
An unavoidable narrow suppression needs its reason next to the affected code.
The [TypeScript configuration](../../tsconfig.json) is the executable source.

### II. Multi-Tenant Safety Is Enforced Server-Side, Never Trusted From the Client

The validated token claim is the server's authority for tenant scope. A client-supplied hint
MUST NOT authorize access. The frontend derives its routing header from the session token,
never from a route, query or independent localStorage value.
See [ADR 0006](../../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md).

### III. Authentication via the Existing identity-service (Fixed Ports)

Authentication MUST use the existing identity-service through OIDC. Local frontend and identity
ports are fixed by the [AppHost](../../../../backend/AppHost/AppHost.cs) and registered redirects;
changes must keep them aligned. Environment setup belongs in the [README](../../README.md).

### IV. Generated OpenAPI Client Only

The HTTP boundary MUST use the generated OpenAPI types. The
[generator](../../scripts/generateApiTypes.mjs) produces types and date metadata;
openapi-fetch creates the client and the repository-owned facade implements the shared behavior.
It does not generate the facade.

Backend wire DTOs MUST come from the contract; frontend domain models and form types may be
authored separately. Endpoint calls go through the shared client/facade, without handwritten fetch
calls or duplicate wire DTOs. See the [API boundary](../../docs/ARCHITECTURE.md#2-talking-to-the-backend).

### V. CI Quality Gates Are Non-Negotiable From Scaffold

Applicable ESLint, Prettier, TypeScript/build, Vitest coverage, Playwright, OpenAPI drift and real
OIDC smoke gates MUST pass before merge. The
[workflow](../../../../.github/workflows/frontend-ci.yml) and
[coverage configuration](../../vitest.config.ts) define their current commands and limits.
Do not waive or lower them to make a change pass.

### VI. No Frontend Docker — Aspire Is the Only Local Orchestrator

Local orchestration MUST use Aspire. Do not add a frontend Dockerfile or a parallel orchestration
graph. A maintenance container used to regenerate a lockfile does not define a second development
environment; that procedure lives in the [README](../../README.md#lockfile).

## Technology & Environment Context

This is an npm workspace frontend. Runtime and toolchain versions come from repository pins;
service URLs, CORS and OIDC redirects must agree with the AppHost environment.
Use the [README](../../README.md) for setup and commands.

## Explicitly Deferred Decisions

UI composition, state management, dependency injection, folder layout and error presentation
are planning-level decisions, not additional constitutional principles. Their existing choices
are described in the [current architecture](../../docs/ARCHITECTURE.md) and the
[ADR index](../../../../docs/adr/README.md); they are not undecided merely because this constitution
does not prescribe them.

For example, [ADR 0039](../../../../docs/adr/0039-admin-frontend-base-ui-primitives.md) selects
Base UI primitives. Follow relevant current decisions and explicitly record a change to one in
the appropriate plan or ADR, according to the root workflow.

## Governance

These principles supersede ad hoc convention within their scope. Amend this file in the PR
changing a principle, update the brief Sync Impact Report and version, and explain the impact.
MAJOR removes or redefines a principle; MINOR adds or materially expands one; PATCH clarifies wording.
Amendments take effect on merge.

Spec Kit plans and implementation MUST respect the principles. A conflicting proposal must be
changed or explicitly record the conflict and obtain sign-off before implementation.
The workflow provides automated checks for types and contract drift; server tenant enforcement,
environment alignment and orchestration boundaries also require review. Passing CI alone does not
prove all principles.

**Version**: 1.0.1 | **Ratified**: 2026-08-18 | **Last Amended**: 2026-10-27
