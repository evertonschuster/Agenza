# Shared value objects

The [architecture](../../../../backend/docs/ARCHITECTURE.md#3-domain) and
[ADR 0055](../../../../docs/adr/0055-shared-string-value-objects.md) define the shared contracts.
A context-specific rule stays with its service; this procedure covers shared string/date formats.

## Check semantics and consumers

Inspect the existing [value objects](../../../../backend/shared/Admin.SharedKernel.ValueObjects/)
before adding one. Sharing a format requires compatible normalization and meaning, not merely
similar property names. Check real callers and explain the shared placement in the PR.

Trace how the value will arrive: body, query or route. A URL-readable string type explicitly opts in
with its type converter. Compare
[SearchText](../../../../backend/shared/Admin.SharedKernel.ValueObjects/SearchText.cs);
do not make personal-data types URL-readable merely to reuse query binding, since URLs reach logs.

## Implement the affected path

1. Follow [IStringValueObject](../../../../backend/shared/Admin.SharedKernel.ValueObjects/IStringValueObject.cs)
   or [IDateValueObject](../../../../backend/shared/Admin.SharedKernel.ValueObjects/IDateValueObject.cs),
   with a private constructor and public static Create/Restore members. EF resolves these members
   by name; an explicit interface implementation can compile and still fail model construction.
2. Create normalizes and returns ParseResult with a user-facing failure; Restore reconstructs stored
   state without validation. A shared parse failure does not introduce a service DomainError.
   Keep submitted personal values out of error messages.
3. Check blank/missing handling against the converter, not only the type. BlankIsAbsent controls
   whether a blank string binds as null; Create(null/empty/whitespace) still needs its own failure.
   [FullName](../../../../backend/shared/Admin.SharedKernel.ValueObjects/FullName.cs) demonstrates the
   required-value opt-out. Date construction receives today rather than reading a clock.
4. Verify the service's existing JSON/OpenAPI/EF registrations before adding wiring.
   [ModelConfigurationBuilderExtensions](../../../../backend/shared/Admin.SharedKernel.EntityFrameworkCore/ModelConfigurationBuilderExtensions.cs)
   applies conversions to the shared assembly; do not duplicate a per-column conversion for a
   registered shared type.
5. Replace duplicate request validation/mapping for that shared format only where the new typed
   member now owns parsing. Retain aggregate-specific or cross-field rules.

Test normalization, limits and Restore separately, then the actual wire binding. Use
[StringValueObjectContractTests](../../../../backend/shared/Admin.SharedKernel.Tests/StringValueObjectContractTests.cs)
and an existing
[binding test](../../../../backend/services/services-service/ServicesService.Tests/Clients/CreateClient/CreateClientCommandFullNameBindingTests.cs).
A converter test does not establish every endpoint's missing/null behavior.
Regenerate/check the consumed OpenAPI types when the contract changes; inspect the resulting diff
rather than assuming a shared value object leaves every generated type unchanged.
