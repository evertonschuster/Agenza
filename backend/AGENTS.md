# backend — instructions for agents

Complements the [root AGENTS](../AGENTS.md). The pins are in [global.json](global.json),
[Directory.Packages.props](Directory.Packages.props) and [.config/dotnet-tools.json](.config/dotnet-tools.json).

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

[§10](docs/ARCHITECTURE.md#10-reference-code-and-the-older-generation) points to examples of the
current shape. Compare them with the affected code; a divergence does not authorize refactoring
independent areas. The why behind each convention and what was already refused are in the
[decisions](../docs/decisions/), mapped at the top of the guide.

## Invariants

- Each service belongs to a context; an operation that fits it does not need another service.
- Domain stays free of infrastructure and packages, and may reference the shared value objects. The
  handler orchestrates the operation through ports; the domain keeps its invariants.
- Expected failures use Result. Input validation, domain, current state and persistence have
  distinct responsibilities; names or syntax alone do not prove a defect.
- The server tenant comes from the validated claim. A header or tenant sent by the client does not
  authorize access; filters, assignment on save, relationships and roles have their own limits,
  described in §5.

## Skills

Use the [skill table in the root AGENTS](../AGENTS.md#skills).

## Validation and delivery

Use the [README commands](README.md#commands) and the
[applicable gates](../docs/DEVELOPMENT.md#quality-gates). Choose tests by the behavior and risk
changed; PostgreSQL-only properties follow the disposable verification in §9. For Markdown, check
sources, links, formatting and the diff.

A contract change carries the regenerated OpenAPI types in the backend PR; frontend work follows the
root's separate flow. Record what actually ran and what is still unproven. Architectural decisions
follow the root process. Update the rule or example the change invalidates, without creating feature
inventories, counts or extra run reports.
