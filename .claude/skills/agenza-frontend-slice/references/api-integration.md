# The api segment: repository, Result, and the one conversion boundary

Authoritative source: [`docs/ARCHITECTURE.md`](../../../../apps/admin-frontend/docs/ARCHITECTURE.md) §2.
Live code: `src/shared/api/servicesFacade.ts`, `src/shared/api/servicesApi.ts`,
`src/shared/api/unwrap.ts`, `src/shared/result.ts`. Full wiring narrative:
`specs/001-oidc-shell-scaffold/contracts/api-client-contract.md`.

No slice calls the backend today — the API layer stands with zero call sites deliberately
([ADR 0038](../../../../docs/adr/0038-admin-frontend-remove-categories-harness.md)). Do not delete
anything under `shared/api/` because "nothing imports it"; you are the first importer.

## What a repository must NOT state

The token. The tenant. The API version. The response envelope. Exception handling. All five are paid
once in `shared/api/` so no call site restates them. A repository that adds a `try/catch`, a
`headers` object, or a `v1.0` in the path is reimplementing the layer below it.

Corollary: `X-Tenant-Id` is stripped from the generated types on purpose — there is no way to set it
by hand, and you must not try. The tenant comes from the validated token claim; the header is routing
convenience, not a boundary ([ADR 0006](../../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md)).
Use `agenza-tenant-isolation` for anything tenant-shaped.

## Shape

The domain entity is **hand-written in `model/`**, owned by the frontend. Never
`components['schemas']['…']` — that inverts the dependency and makes the UI reach through to the wire
layer for a type.

```ts
// features/<slice>/api/<entity>Repository.ts
import type { ApiResult } from '@/shared/api/servicesFacade';
import { servicesApi } from '@/shared/api/servicesApi';
import type { Client, ClientListFilter } from '../model/client';

export const clientRepository = {
  list: (filter: ClientListFilter = {}): Promise<ApiResult<Client[]>> =>
    servicesApi.get('/api/v{version}/clients', {
      query: filter.search ? { Search: filter.search } : {},
    }),
};
```

The return annotation is the compile-time checkpoint: when the wire shape changes under you, the
delegation stops type-checking. Forward the result verbatim while the domain type is structurally
what the endpoint returns. Add a `toDomain(dto)` mapper **only when wire and domain genuinely
diverge** — not as a reflex, not "for symmetry".

Regenerate wire types with `npm run generate:api-types`; CI fails on drift via
`generate:api-types:check`. See `agenza-api-contract` when the envelope or error contract is in play.

## `servicesApi` never rejects

`run()` in `servicesFacade.ts` is one big `try/catch`, so every outcome arrives as a value:

- `2xx` → `ok(payload)`, lifted out of the `{ data, success, … }` envelope.
- non-`2xx` with an RFC 7807 problem body → `fail(problem)` verbatim.
- no session (the client's middleware threw `MissingSessionError`) → `fail(SESSION_PROBLEM)`.
- thrown fetch — offline, DNS, refused → `fail(NETWORK_PROBLEM)`.
- non-`2xx` whose body is not a problem — gateway 5xx, empty error → `fail(SERVER_PROBLEM)`.

Those three synthetic problems are exported from `servicesFacade.ts` with `status: 0` and a namespaced
`code`, so the UI branches on them exactly like a backend problem. `SESSION_PROBLEM` is separate from
the transport bucket precisely so an expired session never renders as "sem conexão".

## The conversion boundary — the table people misread

`Result` is the internal currency; the framework boundary is the cashier. React Router and TanStack
Query signal failure **only** by a rejected promise, so a `loader` returning `{ ok: false, error }`
reads as success. `shared/api/unwrap.ts` converts, in exactly one place:

| Boundary               | Converts?                          | Why                                                                 |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------- |
| `repository → loader`  | `unwrapOrThrow`                    | the router signals failure only by rejection                        |
| `repository → queryFn` | `unwrapOrThrow`                    | same; otherwise every query resolves "ok" with an error inside       |
| `action` / mutation    | **no** — `Result` straight through | a 400 with `errors` is expected flow and returns to the form         |
| anywhere below that    | no                                 | plain `Result`; do not open a new `try/catch`                        |

A dead network is exceptional. "E-mail já cadastrado" is not. Routing the second one down the
rejection path turns a validation message into a full error screen, and the user loses what they
typed. If you find yourself calling `unwrapOrThrow` inside an `action`, stop — that is the bug.

Thrown `ApiProblemError`s land on the route `errorElement`; `src/app/AppRouteError.tsx` already
recognises them via `isApiProblemError` and renders `problem.title`.

## Reading a failure

```ts
if (!result.ok) {
  if (result.error.code === 'Session.Missing') return redirect('/login');
  return { fieldErrors: result.error.errors };
}
```

Branch on `result.error.code` and `status`; read per-field messages from `result.error.errors`;
render `result.error.title` as-is. **Never parse or match a free-text backend message** — it is copy,
it is pt-BR, and it changes without a contract bump.

## Deliberately absent — do not reintroduce

- **A server-state library.** Route `loader` + `action` + router revalidation cover one screen. When
  a query lib lands it *replaces* the repository ([ADR 0035](../../../../docs/adr/0035-admin-frontend-no-server-state-library.md)).
  Do not hand-roll caching inside a repository in the meantime.
- **Request cancellation / `AbortController` plumbing.** Built and reverted twice; the effect
  `ignore` flag fixes the real bug ([ADR 0033](../../../../docs/adr/0033-admin-frontend-no-request-cancellation-layer.md)).
  Revisit only for search-as-you-type or a large export.
- **A call-site `settle(call)` wrapper.** Tried and removed — error normalization belongs inside
  `run()`, not in something every caller must remember.

## Testing the api segment

`vi.mock` the `servicesApi` module and assert two things: the path and params the repository sends,
and that a failing result comes back out **as a value** (nothing thrown, nothing swallowed). A
repository test that needs `expect().rejects` means error handling leaked into the repository.

For a `loader`, test that a `fail(...)` becomes a rejection carrying the problem; for an `action`,
test that the same `fail(...)` is *returned*. Those two tests are what keep the table above honest.
