# Repository and API result consumption

For the architecture, consult
[Talking to the backend](../../../../apps/admin-frontend/docs/ARCHITECTURE.md#2-talking-to-the-backend).
[docs/API.md](../../../../docs/API.md) owns HTTP conventions; do not reproduce its status/error
tables in a feature procedure.

## Change a repository

1. Compare the affected operation with
   [clientsRepository](../../../../apps/admin-frontend/src/features/clients/api/clientsRepository.ts)
   or [tagsRepository](../../../../apps/admin-frontend/src/features/tags/api/tagsRepository.ts).
2. Keep frontend model/input types owned by the slice and an explicit `Promise<ApiResult<T>>`
   return type. Forward a structurally compatible result; add a mapper only when the wire and
   frontend shapes differ.
3. Send path, query, body and optional abort signal through `servicesApi`. Authentication, tenant
   headers, versioning and failure normalization belong to the shared API layer. Inspect
   [apiClient.ts](../../../../apps/admin-frontend/src/shared/api/apiClient.ts) or
   [servicesFacade.ts](../../../../apps/admin-frontend/src/shared/api/servicesFacade.ts) when that
   layer is the actual subject of the change; do not compensate for it in a repository.
4. Preserve cancellation from the consumer and return failures as values. A repository does not
   add a `try/catch` or turn an expected validation error into a rejection.

## Consume the result

Read `run()` in [servicesFacade.ts](../../../../apps/admin-frontend/src/shared/api/servicesFacade.ts)
for the effective normalized outcomes. Keep the `Result` through mutations so a failure can return
to the form without discarding its values. Use
[unwrapOrThrow](../../../../apps/admin-frontend/src/shared/api/unwrap.ts) only at a framework
boundary that needs rejection, such as a route loader; do not introduce it inside a mutation.

Branch on stable codes/statuses, not a substring of `title`, `detail` or a field message. Reuse
[formErrors.ts](../../../../apps/admin-frontend/src/shared/api/formErrors.ts) and
[applyApiProblem.ts](../../../../apps/admin-frontend/src/shared/form/applyApiProblem.ts) for form
mapping; they preserve the normalized messages and structured field details. A feature must not
invent a second error taxonomy or infer structured data from free text.

When a mutation publishes a topic, follow the slice's existing use-case boundary, such as
[tagUseCases.ts](../../../../apps/admin-frontend/src/features/tags/application/tagUseCases.ts),
and keep the repository focused on transport delegation.

## Verify the boundary

Mock the `servicesApi` module to verify the request and the unchanged failure value; use a fake
client when testing the facade itself. Test a loader's rejection only when that loader exists;
test a mutation's failed result returning to its caller. Examples and test selection are in
[agenza-testing](../../agenza-testing/SKILL.md).

If the OpenAPI contract changed or generated types drift, use the regeneration procedure in
[agenza-api-contract](../../agenza-api-contract/SKILL.md).
