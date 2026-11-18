# Domain modeling

The [domain rules](../../../../backend/docs/ARCHITECTURE.md#3-domain) own factories, value objects,
errors and aggregate invariants. This procedure helps choose the affected boundary.

## Choose the owner

- Identify the invariant and the state that must change atomically to preserve it. A dependent part
  of that consistency boundary is a child; a concept with an independent lifecycle can be a root.
- Link independent roots by id. A relationship collection belongs to its owner; do not load another
  root into the domain to enforce an invariant that the handler must resolve.
- Decide whether a value has format/normalization or a contextual business rule. Reuse an existing
  shared type when its semantics match; use [value-objects.md](value-objects.md) for shared formats.
  A primitive or enum remains appropriate when its owner can express the rule directly.

Compare [Client](../../../../backend/services/services-service/ServicesService.Domain/Entities/Client.cs),
its [ClientData](../../../../backend/services/services-service/ServicesService.Domain/Entities/ClientData.cs)
and [ClientGuardian](../../../../backend/services/services-service/ServicesService.Domain/Entities/ClientGuardian.cs)
for an aggregate described by data records and children created by their root.
For a service-local value, inspect the relevant type under
[ValueObjects](../../../../backend/services/services-service/ServicesService.Domain/ValueObjects/).

## Change behavior

1. Name the operation by the business intention and enumerate its allowed/refused states.
2. Follow the owning factory or behavior method. Pass external facts such as today from the handler;
   keep clock, persistence and tenant acquisition outside the domain.
3. Validate the complete candidate state before assigning it. For a composition update, preserve the
   aggregate's defined replacement semantics and avoid partial changes on rejection.
4. Keep the rule's named error and limits with its owner. A validator may use the same code/constant;
   it does not become the authority for domain validity.
5. Check identities and child creation through the existing factories. Data records describe desired
   state; they do not bypass construction or turn a domain entity into a request DTO.

Read the handler as well as the entity when changing a transition: domain refusal and an idempotent
HTTP/application outcome can be intentionally different. Do not infer API status from the domain
method alone.

Test new or changed invariants directly, including rejected updates leaving the prior state intact.
Use [ClientTests](../../../../backend/services/services-service/ServicesService.Tests/Clients/ClientTests.cs)
as a live example, and [tests.md](tests.md) to select additional boundaries.
