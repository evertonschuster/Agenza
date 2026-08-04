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
| Agent governance | 0016 |
| Authentication UX and AI delegation | 0020, 0022 |
| Database bootstrap | 0025 as narrowed by 0027, plus 0027/0028 |
| Git workflow | 0021 as amended by 0030/0031 |
| Toolchain compatibility | 0032 |

## Superseded decisions

| ADR | Superseded by | Do not follow |
| --- | --- | --- |
| 0010 | 0012 | Repository-backed FluentValidation rules |
| 0011 | 0012 and 0014 | Validator-only/anemic domain model |
| 0013 | 0024 | Application-only tenant relationship enforcement |
| 0023 | 0026 | Dedicated runtime-test project |
| 0030 local-hook portion | 0031 | Repository-owned local Git hooks |

When an ADR status names a newer decision, the newer ADR wins. Current code,
tests, migrations, and runtime configuration remain the executable truth.

## Complete register

0001 context-aggregated services · 0002 schema per service · 0003 OpenIddict ·
0004 quality stack · 0005 CQRS/vertical slices · 0006 tenant/base-entity
conventions · 0007 command binding · 0008 tenant assignment · 0009
TenantOwnedEntity · 0010/0011 superseded validation experiments · 0012 handler
and domain correction · 0013 superseded relationship enforcement · 0014
Result-based domain/persistence · 0015 test-tier reduction · 0016 agent
governance · 0017 migrations history · 0018 shared-kernel split · 0019 tenant
persistence tests · 0020 authentication feedback · 0021 trunk workflow · 0022
AI tenant context · 0023 superseded runtime tests · 0024 database ownership ·
0025/0027 bootstrap evolution · 0026 runtime-smoke boundary · 0028 migration
baseline · 0029 Aspire-only orchestration · 0030/0031 Git-hook evolution · 0032
stable runtime/toolchain pins.

