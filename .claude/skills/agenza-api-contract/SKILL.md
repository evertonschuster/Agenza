---
name: agenza-api-contract
description: Regenerates the admin-frontend OpenAPI types, diagnoses contract drift and shapes repository calls and API failures (contrato, tipos gerados, repositório, erro da API). Use when an endpoint contract or a feature repository changes. Not for form error mapping (agenza-form-field) or backend handlers (agenza-backend-slice).
---

# API contract — types, repositories and failures

[docs/API.md](../../../docs/API.md) owns the HTTP shapes and the
[message policy](../../../docs/API.md#7-frontend-consumption-and-message-policy). Consult backend
or frontend architecture only for the boundary the task changes.

## Regenerate a changed contract

The [generator](../../../apps/admin-frontend/scripts/generateApiTypes.mjs) reads the live OpenAPI
document; use its `SERVICES_API_OPENAPI_URL` override when the service runs at another address.

```text
- [ ] Start the stack: dotnet run --project backend/AppHost --launch-profile http
- [ ] In another terminal, once the service is ready: npm run generate:api-types --workspace=apps/admin-frontend
- [ ] Review the generated diff, dateFields.ts included; never hand-edit generated files
- [ ] npm run generate:api-types:check --workspace=apps/admin-frontend passes against the same contract
- [ ] Commit the regenerated types in the backend PR that changed the endpoint
```

When the check fails, read its output before deciding whether generation, service startup or
configuration needs correction. It compares generated text, not endpoint behavior. CI runs it for
backend API changes too ([frontend-ci.yml](../../../.github/workflows/frontend-ci.yml)).

For dates or numeric schema transforms, read the
[generator tests](../../../apps/admin-frontend/scripts/generateApiTypes.test.mjs) and
[apiClient.ts](../../../apps/admin-frontend/src/shared/api/apiClient.ts). Build calendar values with
the existing UTC helpers; repositories do not revive dates.

## Add or change a repository

Compare the operation's generated signature with
[clientsRepository.ts](../../../apps/admin-frontend/src/features/clients/api/clientsRepository.ts) or
[tagsRepository.ts](../../../apps/admin-frontend/src/features/tags/api/tagsRepository.ts); both have
paged reads and mutations.

- Call `servicesApi` with path, query, body and the consumer's abort signal, and return an explicit
  `Promise<ApiResult<T>>` typed with the slice's own model.
- Credentials, tenant header, version, envelope and failure normalization belong to `apiClient` and
  `servicesFacade`; a tenant rejection is not permission to select another tenant.
- Forward a compatible result directly; map only the success payload when the model differs. No
  `try/catch`, no duplicated wire schemas, no transport handling in a repository.
- A mutation that publishes a topic does it in the slice's use case, as in
  [tagUseCases.ts](../../../apps/admin-frontend/src/features/tags/application/tagUseCases.ts), not in
  the repository.
- Test it by mocking the `servicesApi` module and asserting the request and the unchanged failure.

## Consume a result

`servicesApi` returns failures as values. Keep the `Result` through actions and mutations so a
failure can reach the form; use [unwrapOrThrow](../../../apps/admin-frontend/src/shared/api/unwrap.ts)
only at a framework boundary that needs rejection, such as a route loader. The form bridge is in
[agenza-form-field](../agenza-form-field/SKILL.md).

Read `run()` in [servicesFacade.ts](../../../apps/admin-frontend/src/shared/api/servicesFacade.ts) for
the normalized outcomes before choosing UI; the table is in [docs/API.md](../../../docs/API.md), "7.
Frontend consumption and message policy". Use `isTransientProblem` when the consumer needs retry
classification; the facade never navigates or retries.

For a list, toast or dialog consumer, keep the established surface and supply fallback copy when
message fields are absent. Framework messages can stay in English; do not claim a translation or
filter the code does not implement.

## Verify

Run the generator fixtures for transform changes and the affected frontend tests for normalization
or mapping changes; HTTP behavior needs the runtime checks. Commands are in the
[frontend README](../../../apps/admin-frontend/README.md#commands). A documentation fix alone does not
require regeneration or starting the stack.
