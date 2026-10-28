---
name: agenza-api-contract
description: Use when regenerating frontend OpenAPI types, resolving contract drift, changing a feature repository, or mapping API failures to UI.
---

# API contract — types and integration procedure

Use [docs/API.md](../../../docs/API.md) for HTTP shapes and the
[message policy](../../../docs/API.md#7-consumo-no-frontend-e-política-de-mensagens).
Consult backend or frontend architecture only for the boundary the task changes.

## Regenerate a changed contract

The [generator](../../../apps/admin-frontend/scripts/generateApiTypes.mjs) reads the live OpenAPI
document. Use its SERVICES_API_OPENAPI_URL override when the running service has a different address.

From the repository root, start the required stack and regenerate:

```sh
dotnet run --project backend/AppHost --launch-profile http
npm run generate:api-types --workspace=apps/admin-frontend
```

Run generation in another terminal once the service is ready. Review and commit every generated
output, including dateFields.ts when changed. Do not hand-edit generated files.
Use generate:api-types:check with the same live contract to diagnose drift; inspect its failure
before deciding whether generation, service startup or configuration needs correction.
The check compares generated text, not endpoint behavior.

When an endpoint contract changes, include regenerated types in the backend PR as required by the
root workflow. This check also runs for backend API changes according to
[frontend-ci.yml](../../../.github/workflows/frontend-ci.yml).

## Add or change a repository

Compare [tagsRepository.ts](../../../apps/admin-frontend/src/features/tags/api/tagsRepository.ts)
or [clientsRepository.ts](../../../apps/admin-frontend/src/features/clients/api/clientsRepository.ts)
with the operation's generated signature. Both have paged reads and mutation examples.

- Call servicesApi and annotate the returned ApiResult with the feature's model type.
- Let apiClient and servicesFacade supply credentials, tenant header, version, envelope handling and
  failure normalization. The generator deliberately removes X-Tenant-Id from call-site parameters;
  a tenant rejection is not permission to select another tenant.
- Forward a structurally compatible result directly. Map only the success payload when the feature
  model differs, preserving the failure. Do not duplicate request/response schemas or add transport
  handling to a repository.
- Compare model and filter placement with the current feature and frontend architecture, rather
  than inventing a new organization as part of an API change.

For dates or numeric schema transforms, inspect the
[generator and its tests](../../../apps/admin-frontend/scripts/generateApiTypes.test.mjs)
and [apiClient.ts](../../../apps/admin-frontend/src/shared/api/apiClient.ts).
Calendar dates in bodies/responses use Date, parameter-reachable schemas stay string and date-time
stays string. Default JSON serialization sends a Date as an instant; backend calendar value objects
keep its written day ([ADR 0078](../../../docs/adr/0078-calendar-date-sent-as-an-instant-keeps-its-written-day.md)).
Construct calendar values with the existing UTC helpers; repositories do not revive dates.

## Consume a result

servicesApi returns failures as values. At a loader or an API requiring rejection, use
[unwrapOrThrow](../../../apps/admin-frontend/src/shared/api/unwrap.ts) at that boundary.
Keep Result as a value in actions and mutations so validation reaches the form.

For field errors, missing codes, reduced tenant problems or empty responses, read
[references/errors.md](references/errors.md). Branch on stable codes and status, never message text.
Do not assume a non-2xx has a body, that a 5xx always receives local copy, or that SERVER_PROBLEM
identifies a response from outside the service.

Validate the affected boundary: generator fixtures for transform changes, frontend tests for
normalization/mapping changes and the applicable runtime checks for HTTP behavior. A documentation
correction alone does not require regeneration or starting the stack.
