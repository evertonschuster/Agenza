# backend — instructions for agents

Complements the [root AGENTS](../AGENTS.md).

## Lookup by task

Read only the rules and examples tied to the change:

| Change                                 | Reference                                                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Service, layer or dependency           | [Architecture §1](docs/ARCHITECTURE.md#1-shape)                                                                    |
| Request, handler, validator or mapping | [§2](docs/ARCHITECTURE.md#2-anatomy-of-a-feature) and [§4](docs/ARCHITECTURE.md#4-errors--one-pipeline-five-gates) |
| Aggregate, child or value object       | [§3](docs/ARCHITECTURE.md#3-domain)                                                                                |
| Tenant, repository, EF or migration    | [§5](docs/ARCHITECTURE.md#5-tenancy-and-persistence)                                                               |
| HTTP boundary                          | [§6](docs/ARCHITECTURE.md#6-http-surface), the current controller and OpenAPI                                      |
| Time, style or logging                 | [§7](docs/ARCHITECTURE.md#7-time) and [§8](docs/ARCHITECTURE.md#8-code-style)                                      |
| Validation and guarantees              | [§9](docs/ARCHITECTURE.md#9-tests) and [§11](docs/ARCHITECTURE.md#11-what-enforces-what)                           |
| Example of the current shape           | [§10](docs/ARCHITECTURE.md#10-reference-code-and-the-older-generation)                                             |

The why behind each convention and what was already refused are in the
[decisions](../docs/decisions/), mapped at the top of the guide.

## Invariants

- Each service belongs to a context; an operation that fits it does not need another service.
- Domain stays free of infrastructure and packages, and may reference the shared value objects. The
  handler orchestrates the operation through ports; the domain keeps its invariants.
- Expected failures use Result. Input validation, domain, current state and persistence have
  distinct responsibilities; names or syntax alone do not prove a defect.
- Application handlers consume `ICurrentUserAccessor` and `ITenantAccessor` from `Admin.SharedKernel`
  directly; their HTTP implementations stay in `Admin.Identity.Client`, without pass-through providers.
- Beyond the root tenant rule, filters, assignment on save, relationships and roles have their own
  tenant limits, described in §5.

OAuth clients and scopes use native OpenIddict descriptors directly in `DatabaseSeeder`, without
intermediate configuration models; secrets stay in external configuration.
Declare each client explicitly, including its scopes and resources, without shared configuration variables.
Consent is implicit for all interactive clients; there is no consent screen.
SPA and MCP share operation authorization, with `services-api` and `services-mcp` as their respective
OAuth resource scopes;
OAuth audiences still identify the destination of each token.
API and MCP share the authenticated-tenant policy, without additional subject-format or scope
requirements. Only the REST API requires and compares `X-Tenant-Id`; MCP uses the tenant claim.
MCP tools use primitive input contracts with `Description` metadata and constructor defaults,
registered through the SDK's `WithTools<T>()`. Map inputs explicitly to Application requests using
the existing value object factories; do not add generic binding or schema infrastructure for VOs.
The SDK owns argument binding, schema generation and exception responses. Native MCP error messages
may remain in the SDK's language; expected value object and Application Result failures keep their
mapping. MCP output uses the shared value object and enum converters.

## Validation and delivery

Use the [README commands](README.md#commands) and the
[applicable gates](../docs/DEVELOPMENT.md#quality-gates). Choose tests by the behavior and risk
changed; PostgreSQL-only properties follow the disposable verification in §9. Update the rule or
example the change invalidates, without creating feature inventories, counts or extra run reports.
