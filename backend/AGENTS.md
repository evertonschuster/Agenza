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
Register MCP tools through the SDK's `WithTools`, without application-owned discovery or registration.
`AddMcpValueObjectInputs` supplies the shared JSON options to that registration and adjusts schemas
of the registered tools. Queries and commands may be parameters directly, including shared value
objects; tool methods do not duplicate input contracts or parse VOs. Preserve descriptions,
defaults and nullability in the published schema.
The SDK owns argument binding and invocation; do not pre-deserialize arguments or duplicate VO factories.
The tool filter maps `ArgumentException` to a global `Validation.Failed` naming only the parameter,
never the exception message, which may carry sensitive data; the original is logged as a warning
with trace and correlation IDs.
The tool filter maps `JsonException` to `Validation.Failed`. Each tool takes one request object (a query or a command), so the field
path always carries its name (`query.page`); with several arguments it stays relative to the
deserialized argument, and the message reports only the kind of value received, never the value.
The schema-derived text can never fail the error path: any problem reading it falls back to the
serializer's message.
When the value's kind contradicts the published schema (type or enum), the message is derived from
the schema (`query.page: esperado número inteiro.`); otherwise the exception's original message
stays, which is where value object messages come from. Without a path the error is global. `McpException` (including protocol errors), requests for additional input and requested cancellation stay with the SDK.
Timeouts and unexpected failures return trace and correlation IDs. Application Result failures keep
their mapping.
MCP output uses the shared value object and enum converters.

## Validation and delivery

Use the [README commands](README.md#commands) and the
[applicable gates](../docs/DEVELOPMENT.md#quality-gates). Choose tests by the behavior and risk
changed; PostgreSQL-only properties follow the disposable verification in §9. Update the rule or
example the change invalidates, without creating feature inventories, counts or extra run reports.
