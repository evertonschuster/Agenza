# Cross-cutting ADR index

Read this index first and open only ADRs relevant to the task. An ADR marked
superseded is historical evidence, not current implementation guidance.

## Current decisions by concern

| Concern | Current ADRs |
| --- | --- |
| Service and data topology | 0001, 0002, 0003, 0024, 0029 |
| Backend CQRS, validation, Result flow | 0005, 0006, 0007, 0009, 0012 as narrowed by 0049, 0014, 0018, 0048, 0049 as narrowed by 0061, 0051, 0057 |
| Tenant assignment and persistence | 0006, 0008, 0009, 0017, 0019, 0024, 0028, 0046, 0081 |
| Aggregates, value objects, factories, DTOs, uniqueness and field conflicts | 0044 as narrowed by 0051 and 0058, 0046, 0048, 0049, 0055, 0056, 0058, 0059, 0060, 0062, 0063, 0064, 0065, 0066, 0068 |
| Dates, times and time zones | 0045 as amended by 0078, 0078 |
| Testing and runtime smokes | 0004, 0015 as narrowed by 0019/0026, 0026, 0050 |
| Authentication UX and AI delegation | 0020, 0022 |
| Database bootstrap | 0025 as narrowed by 0027, plus 0027/0028 |
| Git workflow | 0021 as amended by 0030/0031 |
| Toolchain compatibility | 0032, 0050 |
| Logging and telemetry | 0054 |
| admin-frontend architecture | 0033, 0034, 0035, 0036, 0037, 0038, 0075 |
| admin-frontend UI foundation | 0039, 0040, 0043 |
| admin-frontend screens | 0067, 0070 as amended by 0071/0072/0073, 0074 as amended by 0076, 0076, 0077 as amended by 0078, 0078 |
| AI agent instruction files | 0041 |

## Superseded decisions

| ADR | Superseded by | Do not follow |
| --- | --- | --- |
| 0010 | 0012 | Repository-backed FluentValidation rules |
| 0011 | 0012 and 0014 | Validator-only/anemic domain model |
| 0013 | 0024 | Application-only tenant relationship enforcement |
| 0023 | 0026 | Dedicated runtime-test project |
| 0030 local-hook portion | 0031 | Repository-owned local Git hooks |
| 0044 key-casing portion | 0051 | PascalCase keys in the conflict contract (`errors.Cpf`, `errors.Email`) |
| 0044 contact-purposes portion | 0058 | The `ContactPurposes` value object, `ContactPurposeNames` and purposes as strings translated in Application |
| 0049 shared-input-rule portion | 0061 | `<Feature>RuleBuilderExtensions` as the home of a rule two validators share |
| 0053 | 0056 | Synchronizing client contacts by id |
| 0069 | 0074 | The tags collection adapter that walks every page of the API |

ADRs 0005, 0006, 0008, 0009, 0012, 0015, 0017, 0021, 0025, 0030, and 0044
contain explicitly marked historical passages. Their status header and the
newer ADR named there win over the historical body.

0016 is abandoned: the formal AI-agent AGENTS.md/skills governance framework it
established was removed. [ADR 0041](0041-ai-instruction-files-reinstated.md) now
decides this concern — it reinstates the instruction files but deliberately not
the `.agents/skills/` mirror, the sync script, or the governance CI job, which
are the parts 0016 identified as the failure. Read 0016 for the failure analysis;
follow 0041 for what to do.

Pointers that died with that removal (`bfd16b8`): ADRs 0005, 0006, 0007 and 0012
send the reader to `backend/CLAUDE.md` and to `backend-use-case` /
`backend-new-microservice` skills, and ADRs 0024, 0026 and 0028 list an
"architecture guard" among their fitness functions. Those skills and the guard
no longer exist, and the guard was not replaced, so the rules it checked are
enforced by review. `backend/CLAUDE.md` exists again, but only as an import of
[`backend/AGENTS.md`](../../backend/AGENTS.md) — not the rulebook those ADRs
describe. The current backend guide is
[`backend/docs/ARCHITECTURE.md`](../../backend/docs/ARCHITECTURE.md).

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
instruction files reinstated · 0042 widgets layer and layer-boundaries lint rule
(proposed) · 0044 clients aggregate, uniqueness rules and conflict contract · 0045 backend works in UTC only ·
0046 separate soft-delete and tenant query filters · 0048 database failures are generic to the user ·
0049 conventions for new backend slices · 0050 xUnit v3 on VSTest and the Aspire CLI bundle ·
0051 camelCase error keys on the wire · 0053 superseded client-contact synchronization ·
0054 Serilog logging pipeline · 0055 string value objects shared by every service ·
0056 client contact composition replacement · 0057 explicit services query tracking ·
0058 closed-set members are plain enums bound by name ·
0059 aggregate data records and handler-owned domain calls ·
0060 clients read by id: one response, no age on the wire, contacts ordered by name ·
0061 validators write their own rules ·
0062 clients deactivate and reactivate ·
0063 clients list and search: generated string columns, whole CPF, status as a plain enum ·
0064 paged reads: one page request in, one paged result out ·
0065 string value objects read from a query or a route, by opt-in ·
0066 enums read from a query or a route by one name ·
0067 admin-frontend Pessoas list: whole CPF, filter and paging deferred, provisional detail route ·
0068 tags list: always paged, shared paging contract and literal name search ·
0069 tags frontend: collection compatibility over bounded API pages during the paging rollout (retired by 0074) ·
0070 admin-frontend paged lists: page and size in the URL, one footer shared through PaginatedListSection ·
0071 admin-frontend paged lists share one hook: filters read by each list, the total kept per filters ·
0072 admin-frontend paged lists keep their state in the hook, not in the URL ·
0073 admin-frontend paged lists ask the backend only when an action tells them to ·
0074 admin-frontend Etiquetas pages on usePaginatedList, asks only when told to, with its state out of the URL ·
0075 admin-frontend a 429 is a transient problem of its own, shown with its own message ·
0076 admin-frontend Pessoas and Etiquetas filter bars on React Hook Form with reusable SelectField and SearchField: Pessoas opens on Ativas, one Buscar applies every filter ·
0077 admin-frontend editing a person on the registration form at /pessoas/:id/editar, with Desativar/Reativar beside the title ·
0078 a calendar date sent as an instant keeps its written day; the admin-frontend sends its `Date` as `JSON.stringify` writes it ·
0079 admin-frontend every page header comes from the routes (handle.crumb), with a back arrow to the level above ·
0081 the bearer keeps the token's claim names, so `sub` reaches the audit columns.
