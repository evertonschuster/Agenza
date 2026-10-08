# ADR 0050 — xUnit v3 on VSTest, and the Aspire CLI bundle

Status: accepted (2026-10); extends [ADR 0032](0032-stable-runtime-and-toolchain-compatibility-pins.md)

## Context

The 2026-10 backend refresh moved every NuGet package, the .NET SDK (10.0.401), the Aspire SDK (13.6.0) and
`dotnet-ef` to the newest stable release. Two of those moves were not plain version bumps, and the first
attempt at each one silenced a warning instead of answering it.

`xunit` 2.9.3 is the last release of xUnit v2; the maintained line is `xunit.v3` 4.x. Its default package
brings Microsoft.Testing.Platform v2, which does not run under `dotnet test` in VSTest mode. The Domain +
Application coverage gate (`coverlet.msbuild` in `Directory.Build.props`) and CI's `--logger trx` both depend
on VSTest. xUnit v3 also enables analyzer xUnit1051, which flagged 92 calls that let a `CancellationToken`
default instead of passing the test's token.

Aspire 13.6 starts moving the dashboard and DCP out of NuGet and into the Aspire CLI bundle. The AppHost SDK
still defaults `AspireUseCliBundle` to `false`, and `Aspire.Hosting.AppHost` warns about that default
(ASPIRE010), announcing that the NuGet dashboard and DCP packages will be deprecated. With the bundle on, the
build fetches the CLI through `dotnet dnx` when none is on `PATH`, and `dotnet run` hands the AppHost to
`aspire run`. The CLI resolves the AppHost's `TargetPath` without a configuration, so it always launches the
Debug build: the API-contract job, which built Release and ran `dotnet run -c Release --no-build`, failed
looking for `bin/Debug/net10.0/AppHost.exe`.

Microsoft.OpenApi 3 is still blocked: `Microsoft.AspNetCore.OpenApi` 10.0.12 depends on
`Microsoft.OpenApi [2.12.0, 3.0.0)`. ADR 0032's pin stands, now at 2.12.2.

## Decision

- Test projects reference `xunit.v3.mtp-off`, the xUnit v3 package without Microsoft.Testing.Platform, and
  keep `Microsoft.NET.Test.Sdk`, `xunit.runner.visualstudio` and `coverlet.msbuild` on VSTest. Every project
  whose name ends in `Tests` is an executable (`OutputType=Exe`), set once in `backend/Directory.Build.props`.
- xUnit1051 stays on. A call that accepts a `CancellationToken` passes `TestContext.Current.CancellationToken`
  in new test code.
- The AppHost sets `AspireUseCliBundle=true`. `dotnet run --project backend/AppHost --launch-profile http`
  remains the one command; the CLI it delegates to comes from `dotnet dnx`, so neither developers nor CI
  install it.
- The API-contract job builds and runs the default (Debug) configuration, the same one the CLI launches.
- No `NoWarn` covers either warning.

## Consequences

`dotnet test`, the coverage threshold and the TRX output behave exactly as before. Moving to
Microsoft.Testing.Platform is a separate change: it needs the `global.json` test runner switch, an MTP
coverage extension that enforces the same threshold, and new CI flags, proved together in one PR.

The first build on a machine downloads the CLI, dashboard and DCP (about 360 MB) into `~/.aspire` and the
NuGet cache, so it needs network access; the NuGet dashboard and DCP packages are no longer restored. Every
CI job that builds the solution pays that download, as it paid for those packages before. Visual Studio's F5
still launches `AppHost.exe` directly, with the bundle paths stamped into it at build time.

`aspire run` has no configuration option, so the AppHost cannot run from a Release build through
`dotnet run`. Anything that starts it must build Debug.

Test code built before this ADR passes `CancellationToken.None` explicitly in handler tests; the analyzer
accepts it, and those calls stay until a change touches them.

Dependabot's `nuget` group will keep proposing `Microsoft.OpenApi` 3.x until ASP.NET Core's OpenAPI
generator accepts it. Those entries are expected, as ADR 0032 already says.
