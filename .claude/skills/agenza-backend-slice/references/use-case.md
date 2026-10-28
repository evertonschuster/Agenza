# Implement a use case

The architecture owns the [slice shape](../../../../backend/docs/ARCHITECTURE.md#2-anatomy-of-a-feature),
[error pipeline](../../../../backend/docs/ARCHITECTURE.md#4-errors--one-pipeline-five-gates) and
[HTTP boundary](../../../../backend/docs/ARCHITECTURE.md#6-http-surface). Read the affected operation
and a current example before editing.

## Request and validation

1. Choose command or query from whether the operation changes state. Keep the input record and
   nested inputs with the operation; consult the wire rules for shared value objects and enums.
2. Compare
   [CreateClientCommandValidator](../../../../backend/services/services-service/ServicesService.Application/Clients/CreateClient/CreateClientCommandValidator.cs)
   for synchronous input rules with stable codes, field ownership and domain limits.
   Existence/uniqueness require current state and belong in the handler through a port.
3. Bound collection size before validating every item; attach cross-field failures to the field the
   person must fix. Shared value-object binding owns its format rules; retain rules involving the
   aggregate or several fields. Use a fixed today from TimeProvider when the rule needs it.
4. For paging, inspect
   [ListClientsQuery](../../../../backend/services/services-service/ServicesService.Application/Clients/ListClients/ListClientsQuery.cs)
   and its validator: normalize filters before the repository and keep request validation explicit.
   Do not add a shared rule abstraction for two validators; reuse codes/constants as specified by
   [ADR 0061](../../../../docs/adr/0061-validators-write-their-own-rules.md).

## Mapping and orchestration

Follow [CreateClientCommandExtensions](../../../../backend/services/services-service/ServicesService.Application/Clients/CreateClient/CreateClientCommandExtensions.cs)
for a request-to-data mapping and
[CreateClientCommandHandler](../../../../backend/services/services-service/ServicesService.Application/Clients/CreateClient/CreateClientCommandHandler.cs)
for the handler-owned domain call. Mapping adds neither I/O nor a new business rule.
The relevant factory can instead be reached through ToModel/ApplyTo in the simpler shape.

For an edit, compare
[UpdateClientCommandHandler](../../../../backend/services/services-service/ServicesService.Application/Clients/UpdateClient/UpdateClientCommandHandler.cs).
Load or return NotFound; apply domain behavior; run current-state pre-checks before staging/saving.
A uniqueness pre-check excludes the edited aggregate and can provide a field code and metadata,
while the database remains authoritative under concurrent writes.

Preserve Result through expected failures. The unit of work owns persistence failure handling;
the handler maps a failed save to the generic use-case error without exposing constraint names.
Do not add a catch around business flow or introduce another orchestrator between handlers.

## Read and response

Use [ListClientsQueryHandler](../../../../backend/services/services-service/ServicesService.Application/Clients/ListClients/ListClientsQueryHandler.cs)
for a paged result mapped in the handler and
[ClientResponse](../../../../backend/services/services-service/ServicesService.Application/Clients/ClientResponse.cs)
for explicit output mapping. Collect referenced ids and read a set when another aggregate's
display data is needed; avoid a repository call per row.

Select handler, validator and binding tests with [tests.md](tests.md). If a public endpoint contract
changes, follow the existing regeneration workflow; a documentation edit does not require it.
