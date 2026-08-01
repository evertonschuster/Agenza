# ADR 0018 — Split `Admin.SharedKernel` into a pure kernel + `Admin.SharedKernel.AspNetCore`

Status: accepted (2026-07)

## Context

`Admin.SharedKernel` held the CQRS/Result primitives every service's
Application layer depends on (`ICommand`/`IQuery`/handlers, `Result`/
`Error`, `IDispatcher`/`Dispatcher`, `PagedResult`,
`ServiceCollectionExtensions`) alongside two members that are
genuinely ASP.NET Core-specific: `ResultExtensions.ToActionResult`
(`Result` → `IActionResult`, needs `Microsoft.AspNetCore.Mvc`) and
`GenericExceptionHandler` (implements `Microsoft.AspNetCore.Diagnostics.IExceptionHandler`).
To make those two compile, the whole project carried a
`<FrameworkReference Include="Microsoft.AspNetCore.App" />` — the
entire ASP.NET Core shared framework — with a comment justifying it as
"both consumers are ASP.NET Core Web APIs, so this costs nothing in
practice."

That justification held for `.Api` projects, but `Admin.SharedKernel`
is also referenced directly by every service's **Application** layer
(`IdentityService.Application`, `ServicesService.Application`), which
backend/AGENTS.md's own layering table describes as depending on
"Domain, Admin.SharedKernel" — deliberately not on anything web/hosting
related. Application referencing a project that pulls in the full ASP.NET
Core framework was a latent violation of that boundary: nothing stopped
a future Application-layer file from reaching for `IActionResult` or
`HttpContext` directly, and `dotnet build`/the architecture guard had no
way to catch it, since the dependency was legal at the project-reference
level even though it shouldn't be at the architectural level.

## Decision

Split the project in two, following the same pattern already
established by `Admin.SharedKernel.EntityFrameworkCore` (a separate
sibling project for the one dependency-heavy concern, not a bigger
`Admin.SharedKernel`):

- **`Admin.SharedKernel`** (unchanged name) — `Cqrs.cs`, `Dispatcher.cs`,
  `Error.cs`, `IDispatcher.cs`, `PagedResult.cs`, `Result.cs`,
  `ServiceCollectionExtensions.cs`. References only `FluentValidation`
  and `Microsoft.Extensions.DependencyInjection.Abstractions` (for
  `IServiceCollection`/`AddScoped`) — both framework-agnostic packages
  with no ASP.NET Core coupling. No `FrameworkReference` at all.
- **`Admin.SharedKernel.AspNetCore`** (new project, namespace
  `Admin.SharedKernel.AspNetCore`) — `ResultExtensions.cs` and
  `GenericExceptionHandler.cs`. References `Admin.SharedKernel` (project
  reference) plus `<FrameworkReference Include="Microsoft.AspNetCore.App" />`.

Only `.Api` projects (and `Admin.SharedKernel.Tests`, which tests both
halves) reference `Admin.SharedKernel.AspNetCore` — `.Application` and
`.Infrastructure` never do. `IdentityService.Application`'s and
`ServicesService.Application`'s project references to `Admin.SharedKernel`
are unchanged; every controller and both `Program.cs` files gained a
`using Admin.SharedKernel.AspNetCore;` for `ToActionResult`/
`GenericExceptionHandler`.

### A transitive dependency this surfaced

Removing `Admin.SharedKernel`'s `FrameworkReference` also removed the
transitive path to `Microsoft.Extensions.Logging.Abstractions` that
`ServicesService.Application`'s command handlers had been relying on for
`ILogger<T>` without an explicit package reference of their own. Added
`Microsoft.Extensions.Logging.Abstractions` directly to
`ServicesService.Application.csproj` — a framework-agnostic package with
no ASP.NET Core coupling, so this doesn't reopen the same boundary
problem; it makes an already-existing, legitimate dependency explicit
instead of accidentally-transitive. `IdentityService.Application` never
used `ILogger` and needed no change.

## Consequences

**Gained**: `Application`'s Clean Architecture boundary
(backend/AGENTS.md: "Application → Domain, Admin.SharedKernel... may not
reach into infrastructure/") is now enforced by the dependency graph
itself, not just by convention — an Application-layer file literally
cannot `using Microsoft.AspNetCore.Mvc` by way of `Admin.SharedKernel`
anymore, since that type only exists in a project Application doesn't
reference. `Admin.SharedKernel.Tests`' coverage report now shows
`Admin.SharedKernel` and `Admin.SharedKernel.AspNetCore` as two distinct
modules, making it visible which half a given test actually exercises.

**No coverage-gate config change needed**: `Directory.Build.targets`
excludes `[Admin.SharedKernel]*` from every consuming service's `.Tests`
gate because `Admin.SharedKernel.Tests` already covers it separately.
`Admin.SharedKernel.AspNetCore` needs no equivalent entry — `.Tests`
projects reference only Domain + Application (never `.Api`), so they
never transitively load `Admin.SharedKernel.AspNetCore` in the first
place; it's excluded by construction, the same way
`Admin.SharedKernel.EntityFrameworkCore` already was.

**What this doesn't change**: the CQRS/Result pattern itself
(docs/adr/0005), the Dispatcher's reflection-based handler resolution,
or any public API shape other than the namespace `ToActionResult`/
`GenericExceptionHandler` now live in
(`Admin.SharedKernel.AspNetCore` instead of `Admin.SharedKernel`) — a
one-line `using` addition per consuming file, not a behavior change.
