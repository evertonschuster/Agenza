---
name: agenza-tenant-isolation
description: Use when reviewing or writing anything that touches tenant scoping — a diff mentioning tenantId, X-Tenant-Id or the tenant_id claim; changes under admin-frontend's shared/session or shared/api; backend ITenantAccessor, TenantHeaderFilter, ITenantOwned, a global query filter or a save interceptor; assistant-service's require_tenant_context; a tenant appearing in a route param, query string, payload or storage; or a test that fabricates a tenant id.
---

# Tenant isolation — review workflow

One sentence, and everything else is a consequence of it:

> **The tenant comes from the validated token claim. Always. Only.**

Never from a URL, a query string, a route param, a form field, a request body, or `localStorage`.
This is the repo's first non-negotiable — [root `AGENTS.md`](../../../AGENTS.md), constitution
Principle II, [ADR 0006](../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md).

**`X-Tenant-Id` is a routing convenience, not a security boundary.** The header is the thing being
*checked*, never the thing doing the checking: the boundary is the backend refusing any request
whose header disagrees with its own validated claim, fail-closed, with a stable code
(`Tenant.ContextMismatch` in .NET, `invalid_tenant_context` in the AI service). Anyone reasoning
"the header proves the tenant" has the arrow backwards, and every bad review of this area starts
there.

## 1. Grep the diff before you read it

Cheap, and it catches most of what matters. Each hit is a question to answer, not an automatic no.

| Pattern | Why it is a flag |
| --- | --- |
| `tenantId` / `tenant_id` in a **function, method, command, query or DTO signature** | The tenant is never threaded by hand ([ADR 0006](../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md), [ADR 0008](../../../docs/adr/0008-automatic-tenant-assignment-on-save.md)). A parameter means someone can pass a different one. |
| A tenant in a path, `useParams`, `searchParams`, `?tenant=`, a query key literal | Client-supplied. Display-only at best; authoritative never. |
| A tenant in a request body, form field, or hidden input | Same, plus it now travels through validation as if it were data. |
| `localStorage` / `sessionStorage` / a cookie holding a tenant | The session already carries it; a second copy is a second truth. |
| `X-Tenant-Id` set anywhere but `shared/api/apiClient.ts` | Only one writer exists, on purpose. |
| The `tenant_id` claim decoded outside `shared/session/tenant.ts`, `HttpContextTenantAccessor`, or `require_tenant_context` | Three decode sites in the whole repo. A fourth is the bug. |
| `[IgnoreTenant]` | **Zero uses today.** A first one has to justify itself in the PR body. |
| `IgnoreQueryFilters()` | Drops soft-delete *and* tenant scoping in one call. Only legitimate in a persistence test asserting the soft delete. |
| `Guid.NewGuid()` / a literal UUID next to the word tenant in a test | See §5. |

## 2. Route by what the diff touches

| Touches | Read |
| --- | --- |
| `apps/admin-frontend/src/shared/session/`, `shared/api/`, anything rendering or caching per tenant | [`references/frontend.md`](references/frontend.md) |
| `backend/**` or `ai-services/**` — accessor, filter, interceptor, entity, migration, FastAPI dependency | [`references/backend.md`](references/backend.md) |

## 3. Order of checks

Cheapest disqualifier first; stop at the first real finding rather than writing a full report.

1. **Where does the value come from?** Trace it to a claim read at the boundary, or reject it. One
   hop is enough — if the trail ends at a parameter, keep walking up until it ends at a claim.
2. **Who can set it?** If a call site *can* pass a tenant, it will eventually pass the wrong one.
   The fix is removing the parameter, not documenting it.
3. **What happens with no tenant?** Every layer must fail closed: 403, `MissingSessionError`, an
   empty result set — never "unscoped".
4. **Is the header being trusted anywhere?** Only the filter/dependency may look at it, and only to
   compare it with the claim.
5. **Does the change weaken a layer of defence in depth?** A query filter, a composite FK and a
   database role each exist because the layer above them can be wrong.

## 4. Two things reviewers assume that are not true here

**There is no roles/permissions model.** Every authenticated user of a tenant sees the entire panel
([`specs/002-ui-foundation/spec.md`](../../../apps/admin-frontend/specs/002-ui-foundation/spec.md)).
The only scope check anywhere is `identity-admin` on M2M tenant provisioning. So "tenant isolation"
is the *whole* authorization story — do not review a change as though an authorization layer sat
behind it, and do not approve a UI that hides a control and calls that a control.

**Identity change on silent renewal is not handled yet.** A renewed token whose `sub` or `tenant_id`
differs from the live one must clear the session and force a full login — otherwise the next request
goes out as the new identity while React still holds rendered state, loaded data and caches
belonging to the previous one. Today `SessionPrincipal` does not even carry `sub`, and
`reduceSession` recomputes from the event without comparing. Nothing is broken while zero screens
load tenant data; **the first slice that does must add the comparison**, and a reviewer of that slice
must ask for it. Detail in [`references/frontend.md`](references/frontend.md).

## 5. Tests

A test may fabricate a tenant **only** by going through the same path production uses.

- Frontend: mint a token with `makeAccessToken({ sub, tenant_id })` from `src/test/oidcUser.ts` and
  let `resolveTenantContext` read it — see `src/shared/session/tenant.test.ts`. A test that reaches
  past the claim and pokes a tenant into the store, a header, or a mocked credential getter is
  asserting a shape the product does not have.
- Backend: the two mechanisms with a real regression suite are the save-time assignment and the
  query filter, in `ServicesService.PersistenceTests`
  ([ADR 0019](../../../docs/adr/0019-narrow-tenant-isolation-persistence-tests.md)). Touching either
  without touching those tests is a finding on its own.

## 6. Writing the finding

Name the exact failure, not the principle. "This adds a `tenantId` parameter to
`serviceRepository.list`, so a call site can scope a read to a tenant the token never granted"
beats "violates multi-tenancy". Then say which layer should have owned it instead.
