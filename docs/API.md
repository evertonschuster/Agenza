# API — HTTP contract

This guide describes the boundary of the services-service business controllers that use the shared
Result pipeline. Health, development documentation and OIDC protocols have their own contracts. Each
operation's schemas, parameters and codes belong to the
[controller](../backend/services/services-service/ServicesService.Api/Controllers), the
[OpenAPI document](../backend/services/services-service/ServicesService.Api/Setup/DocumentationExtensions.cs)
and the feature code; this guide holds the conventions a consumer needs to know.

## 1. Where this lives

Each convention links the code that implements it. The layer rules and the backend examples are in
the [architecture guide](../backend/docs/ARCHITECTURE.md).

## 2. Authentication and tenant — two checks, one message

The [service configuration](../backend/services/services-service/ServicesService.Api/Program.cs)
requires authentication, except for explicitly anonymous endpoints. On actions subject to
[TenantHeaderFilter](../backend/shared/Admin.Identity.Client/TenantHeaderFilter.cs), the X-Tenant-Id
header must be a UUID equal to the validated token's tenant_id claim. A missing, invalid or
different claim or header gets the same rejection. IgnoreTenant skips that comparison but does not
grant anonymous access.

| Rejection                                     | Status | Shape                                                      |
| --------------------------------------------- | ------ | ---------------------------------------------------------- |
| Authentication required or invalid credential | 401    | Authorization problem from the shared pipeline             |
| Insufficient authorization                    | 403    | Authorization problem from the shared pipeline             |
| Invalid tenant context                        | 403    | Reduced ProblemDetails (§4.2), with Tenant.ContextMismatch |

The validated claim remains the server's tenant source: the header does not authorize access
([decisions/platform.md](decisions/platform.md)). A consumer must not try to resolve a 403 by
choosing another tenant.

## 3. Success envelope — ApiResponse

The generic Result conversion in
[ResultExtensions](../backend/shared/Admin.SharedKernel.AspNetCore/ResultExtensions.cs) wraps an
ObjectResult's value in an
[ApiResponse](../backend/shared/Admin.SharedKernel.AspNetCore/ApiResponse.cs), { data, success,
timestamp, traceId, correlationId }. The controller sets the status and, on a creation, the
Location. An operation without content, such as a delete with 204, gets no body.

An illustrative empty page from the tag listing, without the tracing fields:

```json
{
  "data": { "items": [], "totalCount": 0, "page": 1, "pageSize": 20 },
  "success": true
}
```

A page past the last one can be a success with empty items, the real total and the requested page.

In JSON, decimals are numbers without guaranteed trailing zeros; whoever displays them formats money
and percentages. Calendar dates use yyyy-MM-dd; instants are UTC. Enums in the shared format are
camelCase strings.

## 4. Failures at the HTTP boundary

Status, Content-Type and the OpenAPI declaration do not, alone, guarantee that the body has every
ApiProblemDetails field. The rejection can happen in the application, in a filter or before the
action, so the consumer accepts a body without every field, or no body, and does not assume a code
is present.

### 4.1 Canonical shape — ApiProblemDetailsFactory

The [factory](../backend/shared/Admin.SharedKernel.AspNetCore/ApiProblemDetailsFactory.cs) uses
type, title, status, code, traceId, correlationId and errors. On validation the title is generic;
the specific code may be at the top or in the field entries, depending on the origin. Application
errors use the Error's message as the title.

| Origin                                                                     | Content of errors                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------- |
| Validator with FieldErrors                                                 | A list of entries per field path                  |
| Domain or application without FieldErrors                                  | The error under the empty key ""                  |
| Conflict with a field reported by the handler                              | Entries on the matching field, with optional meta |
| Authorization, unexpected error or transport read rejection by the factory | Empty object                                      |

Each entry may contain code, message and meta. Meta is a string map, omitted when null; it carries
context the feature interprets after checking the code, such as the id of a conflicting record. Do
not treat arbitrary metadata as a URL or as access authorization.

The factory converts C# paths to camelCase per segment, keeping indexes: Guardians[0].Name becomes
guardians[0].name ([decisions/backend.md](decisions/backend.md)). The empty key is a general
message, not a form field. A conflict may carry field errors or a message under the empty key; check
the code and the structure received, without inferring the field from the 409 status.

### 4.2 Reduced shape of the tenant filter

The filter's reduced problem, with Tenant.ContextMismatch, has type, title, status and code; it adds
no traceId, correlationId or errors. A tenant rejection is not a network failure.

### 4.3 Model binding failure — before the dispatcher

The [ModelState mapping](../backend/shared/Admin.SharedKernel.AspNetCore/MvcBuilderExtensions.cs)
also uses the canonical factory, with Validation.Failed at the top and in the entries. Missing
properties, malformed JSON, wrong types or values refused in binding never reach the
validator/handler.

The [mapper](../backend/shared/Admin.SharedKernel.AspNetCore/ModelStateErrorMapper.cs) keeps the
ModelState messages. Framework messages may be in English and contain internal names or the parser's
position. Shared value objects and the query/route enum binder provide their own pt-BR messages.

A body read failure may add the action parameter's key, such as command, besides the failed path or
the empty key. The backend does not remove that entry. The JSON parser may stop at the first invalid
value; do not expect the same error collection the validator produces.

Body and query/route use different mechanisms: the
[JSON format](../backend/shared/Admin.SharedKernel/JsonSerializerOptionsExtensions.cs) rejects
numeric enums; the
[enum binder](../backend/shared/Admin.SharedKernel.AspNetCore/EnumNameModelBinder.cs) accepts
exactly one defined name, case-insensitively, and rejects numbers, unknown names or combined names.

### 4.4 Routing 404 and 405 may have no body

A route without a match or an unsupported verb can produce an empty 404/405 from the service itself,
without going through ApiProblemDetailsFactory. That differs from a resource the handler did not
find, which follows the Result pipeline. Other stages, such as authentication, can also reject the
request; do not infer a fixed sequence of headers from the requested path alone.

An identifier with an invalid format may not match the route; Guid.Empty has a GUID format and can
be refused by the validator as 400. The status depends on where the rejection happened.

The absence of a recognizable problem does not prove a proxy answered instead of the service.

## 5. HTTP status by ErrorType

The mapping is in the same ResultExtensions.

| ErrorType            | Status |
| -------------------- | ------ |
| Validation           | 400    |
| NotFound             | 404    |
| Conflict             | 409    |
| Forbidden            | 403    |
| Failure and fallback | 400    |

The [exception handler](../backend/shared/Admin.SharedKernel.AspNetCore/GenericExceptionHandler.cs)
handles unexpected failures with a generic 500 and transport read rejections with the rejection's
status (`Request.TooLarge` for 413, `Request.Invalid` otherwise). A translated persistence failure
uses the generic message defined for the save; constraints and internal details are not a user
message ([decisions/backend.md](decisions/backend.md)).

## 6. Frontend consumption and message policy

This section describes the behavior of
[servicesFacade.ts](../apps/admin-frontend/src/shared/api/servicesFacade.ts); consumers choose
navigation, presentation and a later retry from the Result.

| Result received by the client                                     | Value returned by the facade                                               |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Success                                                           | ok with the envelope's data, dates revived; 204 has no payload             |
| Any 429                                                           | RATE_LIMIT_PROBLEM, with status 429 and a local message, whatever the body |
| Other non-2xx with an object whose title is a string              | The received problem, kept                                                 |
| Other non-2xx without that object                                 | Local SERVER_PROBLEM                                                       |
| Client rejection by MissingSessionError                           | Local SESSION_PROBLEM                                                      |
| Any other rejection thrown by the client, read/parse failures too | Local NETWORK_PROBLEM                                                      |

The guard does not check the problem's origin or completeness: a textual title is enough. Generated
problems, except RATE_LIMIT_PROBLEM, use status 0; the HTTP status of an unrecognized answer is not
kept in SERVER_PROBLEM. None of these values triggers a redirect or a retry by itself.
`isTransientProblem` in the same file treats the four local problems above and any status of 500 or
more as transient.

Messages of kept problems are shown by the consumers, 5xx problems included. Local messages come
from the normalization above, not from a universal translation by code. Branch on code and status
when present; never interpret title, detail or message as a control rule. traceId and correlationId
are for diagnosis.

The [form mapping](../apps/admin-frontend/src/shared/api/formErrors.ts) and the
[React Hook Form bridge](../apps/admin-frontend/src/shared/form/applyApiProblem.ts) carry these
errors to the fields and to root.serverError; which entry and which keys reach the form is in the
[form skill](../.claude/skills/agenza-form-field/SKILL.md), "Apply API errors without losing
recovery data".

**Current limit:** neither the facade nor that mapper translates framework messages or removes the
command entry. They can reach the interface. Changing that needs its own product change; do not add
a diverging local filter in each form.

## 7. Verification and maintenance

The [contract skill](../.claude/skills/agenza-api-contract/SKILL.md), "Regenerate a changed
contract", covers type generation and the drift check; the drift check does not exercise every
operation, message or empty answer and does not replace the consumer's tests.

When changing a convention, check the matching code, configuration and tests and update the affected
source. Record manual runs in the PR, with disposable data and environment; do not turn an
exploration's results into a permanent catalog.
