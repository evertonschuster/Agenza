# ADR 0050 — xUnit v3 on VSTest, and Aspire without the CLI bundle

Status: accepted (2026-10); extends [ADR 0032](0032-stable-runtime-and-toolchain-compatibility-pins.md)

## Context

The 2026-10 backend refresh moved every NuGet package, the .NET SDK (10.0.401), the Aspire SDK (13.6.0) and
`dotnet-ef` to the newest stable release. Two of those moves were not plain version bumps.

`xunit` 2.9.3 is the last release of xUnit v2; the maintained line is `xunit.v3` 4.x. Its default package
brings Microsoft.Testing.Platform v2, which does not run under `dotnet test` in VSTest mode. The Domain +
Application coverage gate (`coverlet.msbuild` in `Directory.Build.props`) and CI's `--logger trx` both depend
on VSTest. xUnit v3 also enables analyzer xUnit1051, which flagged 92 calls that let a `CancellationToken`
default instead of passing `TestContext.Current.CancellationToken`.

Aspire 13.6 starts moving the dashboard and DCP out of NuGet and into the Aspire CLI bundle. The AppHost SDK
still defaults `AspireUseCliBundle` to `false`, and `Aspire.Hosting.AppHost` now warns about that default
(ASPIRE010). The AppHost is started with `dotnet run` (README, `frontend-ci.yml`), and nothing installs the
Aspire CLI.

Microsoft.OpenApi 3 is still blocked: `Microsoft.AspNetCore.OpenApi` 10.0.12 depends on
`Microsoft.OpenApi [2.12.0, 3.0.0)`. ADR 0032's pin stands, now at 2.12.2.

## Decision

- Test projects reference `xunit.v3.mtp-off`, the xUnit v3 package without Microsoft.Testing.Platform, and
  keep `Microsoft.NET.Test.Sdk`, `xunit.runner.visualstudio` and `coverlet.msbuild` on VSTest.
- Every project whose name ends in `Tests` is an executable (`OutputType=Exe`, required by xUnit v3) and has
  xUnit1051 off, both set once in `backend/Directory.Build.props`. The suites run in memory in milliseconds,
  so passing a test cancellation token through every call buys nothing. The existing explicit
  `CancellationToken.None` convention stays.
- The AppHost keeps taking the dashboard and DCP from NuGet and suppresses ASPIRE010 in its project file.

## Consequences

`dotnet test`, the coverage threshold and the TRX output behave exactly as before. Moving to
Microsoft.Testing.Platform is a separate change: it needs the `global.json` test runner switch, an MTP
coverage extension that enforces the same threshold, and new CI flags, proved together in one PR.

Adopting the Aspire CLI bundle is also a separate change. It means installing the CLI locally and in the
API-contract job, and it should happen before a future Aspire release stops shipping the NuGet dashboard.

Dependabot's `nuget` group will keep proposing `Microsoft.OpenApi` 3.x until ASP.NET Core's OpenAPI
generator accepts it. Those entries are expected, as ADR 0032 already says.
