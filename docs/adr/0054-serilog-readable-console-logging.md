# ADR 0054 — Serilog is the logging pipeline of every .NET host, in one shared library

Status: accepted (2026-10)

## Context

Logs came from the default Microsoft console provider plus the OpenTelemetry logging provider, configured separately
for each API (`appsettings.json`) and for the AppHost. The console showed two lines per event
(`info: Microsoft.Hosting.Lifetime[14]`, then the message), every EF Core command as a multi-line SQL block at
`Information`, five lines for one outgoing HTTP call (HttpClient handlers plus Polly), and nothing at all for a normal
request because `Microsoft.AspNetCore` is `Warning`. The signal was buried, and the AppHost looked different from the
services.

## Decision

`backend/shared/Admin.Logging` owns how a .NET process logs. Its callers are `ServiceDefaults` (so every service that
calls `AddServiceDefaults()`) and the AppHost; nothing else references it. Code keeps writing `ILogger<T>` against
`Microsoft.Extensions.Logging.Abstractions`; Domain and Application never reference Serilog, and the static `Log` is
neither used nor replaced ([0018](0018-shared-kernel-aspnetcore-split.md)).

A new service gets all of the following from `AddServiceDefaults()`, with no `Program.cs` line and no settings block:

- **One console format**, `[HH:mm:ss LVL] Category: message`, then the exception block. The category is written in full
  (`ServicesService.Application.Clients.CreateClient.CreateClientCommandHandler` for an `ILogger<T>`): the first version
  cut it to its last segment, which turned `Microsoft.Hosting.Lifetime` into a misleading `Lifetime`. Culture is
  invariant (`35.8 ms`, not `35,8 ms`), in the console and in the OTLP body.
  The time is the host's local time: [0045](0045-backend-works-in-utc.md) is about domain and persistence instants, and
  the OTLP export carries absolute ones. `UtcDateTime(@t)` in the template flips it.
- **Colors** only in `Development`, never with `NO_COLOR`. A service passes `colorWhenRedirected` because the Aspire
  dashboard renders ANSI although stdout is redirected; the AppHost does not, since under `aspire run` the CLI captures
  its output to a file.
- **Levels in code**: `Information`, with `Microsoft.AspNetCore`, `Microsoft.EntityFrameworkCore.Database.Command`,
  `System.Net.Http.HttpClient` and `Polly` at `Warning`. `Serilog:MinimumLevel` in configuration overrides or extends
  that per host (the AppHost quiets `Aspire.Hosting.Dcp` there), and `Serilog:Filter` drops messages by text.
  `OpenIddict` stays at `Information` on purpose: it reports rejected token and authorization requests there, in the
  same category as its request and response dumps. identity-service therefore keeps the level and filters the dumps
  (`was successfully extracted/validated/returned`, `matched a server endpoint`): a token request goes from about
  twenty lines to the request line, plus the reason when it is rejected. If OpenIddict rewords a message the noise
  comes back; nothing is hidden. `Logging:LogLevel` is no longer read.
- **Structured export** through `Serilog.Sinks.OpenTelemetry`, only when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. It reads
  the `OTEL_*` variables Aspire injects, so log-to-trace correlation and the resource name need no code.
- **One line per request**, from an `IStartupFilter` that puts `UseSerilogRequestLogging` outside the application's own
  middleware, so a 500 turned into a problem response by `UseExceptionHandler` is still logged with its status.
  `/health` and `/alive` (passed in by ServiceDefaults) and files served without an endpoint are `Verbose`, unless the
  request throws or answers 5xx: a failing probe is logged as an error like any other request. The query
  string is never logged, and control characters are stripped from the path, as `GenericExceptionHandler` already does
  for its own line (CWE-117).

## Tried and set aside

- **First version**: the template compiled into the AppHost as a linked file, `app.UseRequestLogging()` in each
  `Program.cs`, and the same `Serilog` block copied into three `appsettings.json`. It worked, but a new service had to
  remember all three, and the AppHost's copy of the format could drift. That is what this library replaces.
- A template that escapes CR/LF in every message: `Replace` does not exist in Serilog.Expressions 5.0. A sink wrapper
  would do it, but one request path is the only attacker-controlled value the new code adds.
- The default `ExpressionTemplate` theme: it silently drops the colors when stdout is redirected, which is always the
  case under Aspire.
- Keeping the OpenTelemetry logging provider next to Serilog (`writeToProviders`): two level configurations for one
  stream.
- A JSON console outside Development, a file sink, a bootstrap logger with a top-level `try`/`catch`: nothing needs them
  yet, and OTLP already carries the structured form.
- The Python assistant service: Serilog is .NET. It keeps its own logging.

## Consequences

- To see SQL again, set `Microsoft.EntityFrameworkCore.Database.Command` to `Information` under
  `Serilog:MinimumLevel:Override` in `appsettings.Development.json`.
- The control-character guard covers the request line and `GenericExceptionHandler`; any other template value is
  written as-is. Today's application log sites log constraint names, error codes and enum kinds, never request input,
  so nothing else needs it yet. A new log site that puts request input in a message must sanitize it, or the guard
  moves to a sink wrapper.
- A request answered without a matched endpoint and with a 2xx/3xx status is treated as a static file. A redirect from
  `UseHttpsRedirection` is therefore `Verbose` too.
- `Admin.Logging` has its own test project and coverage gate, like `Admin.SharedKernel`.
