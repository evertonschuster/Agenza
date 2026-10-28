# Map an API failure to its consumer

The maintained wire shapes are in [docs/API.md §4](../../../../docs/API.md#4-falhas-na-fronteira-http).
The [message policy](../../../../docs/API.md#7-consumo-no-frontend-e-política-de-mensagens)
describes the facade's normalization and current display behavior; do not duplicate its taxonomy
in each feature.

## Identify the failure before choosing UI

Read the result returned by
[servicesFacade.ts](../../../../apps/admin-frontend/src/shared/api/servicesFacade.ts).
The generated ApiProblem fields are optional and nullable; code and errors may be absent.
A title string is enough for the facade to preserve a received problem except on 429.

SERVER_PROBLEM means an HTTP failure had no recognized problem object. An empty 404/405 can come
from the service itself. A 500 with a recognized problem is preserved. A rejected client call
uses NETWORK_PROBLEM unless it is MissingSessionError; this is not proof of the physical cause.

Use isTransientProblem when the existing consumer needs retry classification. The facade does not
navigate or retry. Decide the consumer's behavior from the code/status and established UX, not
from title or detail. Use existing fallback copy when no usable message is available.

## Apply a failure to a form

Use [toFormErrors](../../../../apps/admin-frontend/src/shared/api/formErrors.ts) with the form's
field paths, or the existing
[applyApiProblem](../../../../apps/admin-frontend/src/shared/form/applyApiProblem.ts) bridge for
React Hook Form. Do not add a parallel error parser.

The mapper preserves the first entry's message, code and metadata for a matched field, normalizes
indexed paths and sends unmatched messages to the form level. It returns one general message,
using title only if no field or general message was collected. The bridge preserves metadata and
uses the code as the field error type, with a fallback when absent.

A field entry can carry metadata from a conflict. Check that field's error code before using its
metadata; the shared mapper does not interpret a client id, build a URL or authorize navigation.
The [person section](../../../../apps/admin-frontend/src/features/clients/ui/pages/ClientFormPage/components/ClientPersonSection.tsx)
shows how a feature observes the field error and renders a conflict destination.

Consult [formErrors.test.ts](../../../../apps/admin-frontend/src/shared/api/formErrors.test.ts)
and [applyApiProblem.test.ts](../../../../apps/admin-frontend/src/shared/form/applyApiProblem.test.ts)
for the boundary being changed. Unknown keys, including the body parameter's command entry, are
not silently removed by the mapper. Framework messages can remain in English; a documentation
cleanup must not claim translation or filtering that the code does not implement.

For a non-form consumer, retain the established list, toast or dialog behavior and supply a fallback
when message fields are absent. Keep presentation/accessibility wiring with the consumer instead
of recreating transport policy here.
