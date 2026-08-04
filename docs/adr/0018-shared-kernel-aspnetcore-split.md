# ADR 0018 — Split the shared kernel from ASP.NET Core adapters

Status: accepted (2026-07)

## Context

Application projects need CQRS and Result primitives but must not acquire web
framework types through a transitive `Microsoft.AspNetCore.App` reference.
Keeping `IActionResult` conversion and exception-handler adapters in the same
project made that boundary conventional rather than structural.

## Decision

- `Admin.SharedKernel` contains framework-neutral CQRS, Result, dispatcher,
  paging, and dependency-registration primitives. It has no ASP.NET Core
  framework reference.
- `Admin.SharedKernel.AspNetCore` contains `ResultExtensions.ToActionResult`
  and `GenericExceptionHandler` and references the pure kernel.
- API projects may reference both projects. Domain, Application, and
  Infrastructure projects must not reference the ASP.NET Core adapter.
- A project that uses a framework-neutral abstraction such as `ILogger<T>`
  declares that package explicitly instead of relying on a transitive web
  framework reference.

## Consequences

The dependency graph now enforces the Application/web boundary. API consumers
use the `Admin.SharedKernel.AspNetCore` namespace; CQRS and Result behavior are
unchanged. Project-reference and architecture checks must reject an adapter
reference from non-API layers.
