# Cross-cutting ADR index

Read this index first and open only ADRs relevant to the task. An ADR marked
superseded is historical evidence, not current implementation guidance.

## Current decisions by concern

| Concern | Current ADRs |
| --- | --- |
| Service and data topology | 0001, 0002, 0003, 0024, 0029 |
| Backend CQRS, validation, Result flow | 0005, 0006, 0007, 0009, 0012, 0014, 0018 |
| Tenant assignment and persistence | 0006, 0008, 0009, 0017, 0019, 0024, 0028 |
| Testing and runtime smokes | 0004, 0015 as narrowed by 0019/0026, 0026 |
| Authentication UX and AI delegation | 0020, 0022 |
| Database bootstrap | 0025 as narrowed by 0027, plus 0027/0028 |
| Git workflow | 0021 as amended by 0030/0031 |
| Toolchain compatibility | 0032 |
| admin-frontend architecture | 0033, 0034, 0035, 0036, 0037, 0038 |
| admin-frontend UI foundation | 0039, 0040 |
| AI agent instruction files | 0041 |

## Superseded decisions

| ADR | Superseded by | Do not follow |
| --- | --- | --- |
| 0010 | 0012 | Repository-backed FluentValidation rules |
| 0011 | 0012 and 0014 | Validator-only/anemic domain model |
| 0013 | 0024 | Application-only tenant relationship enforcement |
| 0023 | 0026 | Dedicated runtime-test project |
| 0030 local-hook portion | 0031 | Repository-owned local Git hooks |

ADRs 0005, 0006, 0008, 0009, 0012, 0015, 0017, 0021, 0025, and 0030
contain explicitly marked historical passages. Their status header and the
newer ADR named there win over the historical body.

0016 is abandoned: the formal AI-agent AGENTS.md/skills governance framework it
established was removed. [ADR 0041](0041-ai-instruction-files-reinstated.md) now
decides this concern — it reinstates the instruction files but deliberately not
the `.agents/skills/` mirror, the sync script, or the governance CI job, which
are the parts 0016 identified as the failure. Read 0016 for the failure analysis;
follow 0041 for what to do.

## Complete register

0001 context-aggregated services · 0002 schema per service · 0003 OpenIddict ·
0004 quality stack · 0005 CQRS/vertical slices · 0006 tenant/base-entity
conventions · 0007 command binding · 0008 tenant assignment · 0009
TenantOwnedEntity · 0010/0011 superseded validation experiments · 0012 handler
and domain correction · 0013 superseded relationship enforcement · 0014
Result-based domain/persistence · 0015 test-tier reduction · 0016 abandoned
agent governance framework · 0017 migrations history · 0018 shared-kernel
split · 0019 tenant persistence tests · 0020 authentication feedback · 0021
trunk workflow · 0022 AI tenant context · 0023 superseded runtime tests · 0024
database ownership · 0025/0027 bootstrap evolution · 0026 runtime-smoke
boundary · 0028 migration baseline · 0029 Aspire-only orchestration · 0030/0031
Git-hook evolution · 0032 stable runtime/toolchain pins · 0033 no request
cancellation layer · 0034 custom Result type · 0035 no server-state library ·
0036 OIDC session in localStorage · 0037 session core in shared · 0038 categories
harness removed · 0039 Base UI primitives · 0040 three-state theme · 0041 AI
instruction files reinstated.

