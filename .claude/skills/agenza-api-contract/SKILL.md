---
name: agenza-api-contract
description: Use when working across the admin-frontend ↔ services-service boundary — regenerating the OpenAPI types, unblocking a failing generate:api-types:check, writing or changing a repository under features/<slice>/api/, calling servicesApi, deciding where a Result turns into a rejection, or handling an ApiProblem / per-field errors in a form.
---

# API contract — generated types, envelope, errors

Rationale lives in [`docs/ARCHITECTURE.md` §2](../../../apps/admin-frontend/docs/ARCHITECTURE.md)
and [`contracts/api-client-contract.md`](../../../apps/admin-frontend/specs/001-oidc-shell-scaffold/contracts/api-client-contract.md).
This file is the procedure. For the error taxonomy and form mapping, read
[`references/errors.md`](references/errors.md).

## Three layers, one job each

| File (`src/shared/api/`) | States |
| --- | --- |
| `apiClient.ts` | `openapi-fetch` client; middleware attaches `Authorization: Bearer` + `X-Tenant-Id`, throws `MissingSessionError` with no session |
| `servicesFacade.ts` | `get`/`post`/`put`/`del`; injects the version path segment, unwraps the envelope, normalises every failure, returns `ApiResult<T>` |
| `servicesApi.ts` | the composition — `createServicesFacade(createApiClient(getAuthCredentials))` |
| `unwrap.ts` | the single place a `Result` becomes a rejection |

**The facade states everything so call sites state nothing**: version segment, token, tenant header,
envelope, error normalisation. A repository restates none of the five and holds no `try/catch`. If
you are about to add one of them at a call site, the fix belongs in the facade.

**`X-Tenant-Id` is stripped from the generated types on purpose** (`scripts/generateApiTypes.mjs`),
so no call site can set it by hand. It is a routing convenience, not a security boundary — the
boundary is the backend refusing any request whose header disagrees with its own validated token
claim ([ADR 0006](../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md)). Never
"fix" a 403 by sending a different tenant.

## Regenerate the types

`src/shared/api/generated/services-api.d.ts` is generated from **the live OpenAPI document**, not
from a checked-in spec — so the backend has to be running. Its URL and the
`SERVICES_API_OPENAPI_URL` override are in `scripts/generateApiTypes.mjs`.

```
dotnet run --project backend/AppHost --launch-profile http      # repo root, leave it up
npm run generate:api-types --workspace=apps/admin-frontend
```

Commit the result. The file carries a do-not-hand-edit banner and `generate:api-types:check`
regenerates and **byte-compares** — a hand edit is a guaranteed CI failure.

**When `api-contract-check` fails in CI**, it means the committed file no longer matches the live
document. It also fires on a backend-only PR, by design — that is the drift it exists to catch.

1. Start the stack, run `generate:api-types`, commit the diff. That is the whole fix.
2. Read the diff before pushing. Removed operations or changed payload shapes will surface next as
   type errors in the repositories that used them — that is the checkpoint working, not a problem
   to route around.
3. A whitespace-only diff means the Prettier config moved: `generate()` formats with the app's
   resolved config, so regenerate rather than reformat by hand.
4. Never relax the check, never hand-patch the `.d.ts`.

## Calendar dates cross as `Date`, instants as `string`

Three rules that only hold together:

- **Types.** `generateApiTypes.mjs` turns `format: date` into `Date` in request bodies and in
  responses. Only a schema a parameter reaches (following `$ref`s) stays `string`, since a query
  string cannot carry a `Date`. The DTO's name (`*Command`, `*Input`, `*Request`) does not matter.
  `format: date-time` is never mapped. The generator also writes `generated/dateFields.ts`, the
  names of every property it typed as `Date`, including a list of dates, a date inside an inline
  object or a list item, and a date offered by one member of `allOf`/`anyOf`/`oneOf`, and fails when one of those names is something else in another schema or
  when a date sits in a dictionary (`additionalProperties`), which has no name to match. `scripts/generateApiTypes.test.mjs` pins each case against a fixture document
  (`typesFromDocument`, no backend needed); change the rule there first.
- **Wire, out.** `createApiClient` sets no `bodySerializer`, so a `Date` in a request body goes out as
  `JSON.stringify` writes it, an instant (`2016-06-15T00:00:00.000Z`). The backend's date value
  objects keep that instant's day as written and drop the time
  ([ADR 0078](../../../docs/adr/0078-calendar-date-sent-as-an-instant-keeps-its-written-day.md)). An
  instant meant as an instant goes as the ISO `string` its `date-time` type asks for.
- **Wire, in.** JSON has no date type, and openapi-fetch has no hook to parse a body differently, so
  the facade's `run()` passes every successful payload through `reviveDates` (`apiClient.ts`): a
  property named in `DATE_FIELDS` whose value is `yyyy-MM-dd` becomes `utcDate` midnight. A
  repository never converts a date; it forwards the result. Converting by the shape of the value
  alone was turned down: free text such as a note reading `2020-01-01` would become a `Date`.

Build calendar days with `utcDate`/`todayUtc` (`shared/format/date.ts`), never `new Date(y, m, d)`:
that is local midnight, which east of UTC serializes as the previous day.

## Write a repository

None exists today ([ADR 0038](../../../docs/adr/0038-admin-frontend-remove-categories-harness.md)
removed the harness) — the next one sets the precedent. The illustrative shape is in
`ARCHITECTURE.md` §2. Rules:

- The domain entity is **hand-written in `model/`**, never `components['schemas'][…]`. A type that
  is only repository input (a list filter) stays private next to the repository in `api/`.
- Forward the result **verbatim** when the wire shape structurally is the domain type. The return
  annotation `Promise<ApiResult<Service[]>>` is the one compile-time checkpoint against a breaking
  wire change — that is why the annotation is never inferred.
- Add a `toDomain(dto)` mapper only when wire and domain genuinely diverge; then transform the `ok`
  branch and forward the failure object unchanged.

> A numeric field generates as `number`, although the OpenAPI document says `integer | string`: ASP.NET
> also reads numbers from text but only ever writes a number, and `numberAcceptedAsText` in
> `scripts/generateApiTypes.mjs` narrows it. An entity that declares `price: number` therefore forwards
> verbatim. A `toDomain` is needed only when wire and domain genuinely diverge (a renamed field, a
> different structure), not for a number.

## Where a `Result` becomes a rejection

`servicesApi` never rejects, but React Router signals failure *only* by a rejected promise.

| Boundary | Convert? |
| --- | --- |
| repository → `loader` | `unwrapOrThrow` |
| repository → `queryFn` | `unwrapOrThrow` |
| `action` / mutation | **no** — the `Result` goes straight to the form |
| anywhere below | no |

A dead network is exceptional; `"Já existe uma categoria chamada 'Cabelo'."` is not. Calling
`unwrapOrThrow` in an `action` turns a validation failure into a full-screen error boundary — the
single most common misread of this layer.

## Handle a failure

`run()` has exactly six outcomes: `ok(payload)` · the backend's RFC 7807 Problem **verbatim** ·
`SESSION_PROBLEM` · `NETWORK_PROBLEM` · `SERVER_PROBLEM` · `RATE_LIMIT_PROBLEM`. The last four are
synthetic `ApiProblem`s (`status: 0`, except `RATE_LIMIT_PROBLEM`, which keeps `429`), so the UI
branches on them identically to a backend Problem. `SESSION_PROBLEM` is split out of the transport
bucket so an expired session never reads as "sem conexão". Any `429` becomes `RATE_LIMIT_PROBLEM`,
whatever its body, and is transient: the user can try again, when they choose to
([ADR 0075](../../../docs/adr/0075-admin-frontend-rate-limit-is-a-transient-problem.md)). The app never retries
a `429` by itself and never holds the retry buttons.

Branch on `result.error.code`. **Never parse `title` or `detail`** — they are free pt-BR text, they
change without notice, and they are not a contract. Per-field messages live in `result.error.errors`.
Details, the full taxonomy and the form mapping: [`references/errors.md`](references/errors.md).

## What breaks

- Hand-editing the generated `.d.ts`, or regenerating against a stale backend.
- A backend endpoint that skips `ToActionResult` and returns a bare payload: `run()` reads `.data`
  off the body, so the payload unwraps to `undefined` and the call still reports **ok**. Silent, and
  it will look like a frontend bug.
- `try/catch` in a repository or a page — the call cannot reject, so the block is dead code that
  hides the real branch.
- Deciding behaviour from `error.title`, or assuming `errors` is always keyed by a form field
  (see `references/errors.md` — it isn't).
