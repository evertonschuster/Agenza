# ADR 0038 — admin-frontend removes the `categories` harness; the API layer stays with no consumer

Status: accepted (2026-09)

## Context

`features/categories/` was never a product feature. It was added after the
original scaffold spec (FR-013: "the shell must expose no business feature")
as a deliberate, named exception — the one thing that called the real backend
end-to-end while the API layer (`servicesApi`, `apiClient`, `unwrap`,
`servicesFacade`, the generated OpenAPI types) was built out and hardened.
ADR 0033, ADR 0034, ADR 0035, and ADR 0037 were all written against it as the
worked example.

That job is done. §1/§2 of ARCHITECTURE.md now describe the layering,
`Result` pattern, and repository shape directly, without needing a live slice
to point at. Meanwhile `categories` had become the only child route of the
protected area and the only navigation item — occupying the position the next
phase of work (the real UI/graphic direction for the admin panel) needs to
build into. Keeping it around as "the reference slice" was actively in the
way: a second, unrelated effort would have had to either build alongside a
fake domain or delete it first anyway.

## Decision

Remove `src/features/categories/` in full (11 files, including both test
files). Replace its route with a minimal `src/app/HomePage.tsx` — no state, no
API call, no domain — mounted as the protected area's `index` route. The
catch-all route redirects to `/` instead of `/categories`.

`HomePage` lives in `app/`, not in a new `features/home/` slice: a screen with
no domain, no `model`, and no API call is not a vertical slice by this
codebase's own definition of one (ARCHITECTURE.md §1). Creating a slice for it
would contradict the definition to satisfy it.

**The API layer is not touched, and is left with zero call sites, on
purpose.** `shared/api/servicesApi.ts`, `servicesFacade.ts`, `apiClient.ts`,
`unwrap.ts`, `shared/result.ts`, and `shared/api/generated/**` are unchanged.
The backend's categories endpoints and the generated types for them are
unchanged too — only the frontend's consumer is gone.

## Consequences

- After this change, `grep -rn servicesApi src/` (excluding tests) returns
  **nothing**. This is expected, not a regression. The following files have no
  production call site until the next business feature is wired:
  `shared/api/servicesApi.ts`, `shared/api/servicesFacade.ts`,
  `shared/api/apiClient.ts`, `shared/api/unwrap.ts`,
  `shared/api/generated/services-api.d.ts`. `shared/result.ts` still has one
  live consumer (`shared/session`), so it is not fully unreferenced.
- **This is not dead code.** It is tested directly (`apiClient.test.ts`,
  `servicesFacade.test.ts`, `unwrap.test.ts`), it embodies decisions recorded
  in [ADR 0034](0034-admin-frontend-custom-result-type.md) (the `Result` type)
  and [ADR 0035](0035-admin-frontend-no-server-state-library.md) (no query
  library, repository-shaped for one), and the next business feature is
  expected to import `servicesApi` on day one. A future contributor who greps
  for consumers and finds none should read this ADR before deleting anything
  under `shared/api/` — that removal would also unwind ADR 0034 and ADR 0035
  without a new decision having been made to do so.
- `HomePage` is provisional. Its retirement trigger is named in
  ARCHITECTURE.md §6: the first real business route replaces it as the
  protected area's index route.
- The categories backend endpoints and generated types are untouched; a
  future frontend feature can call them again, or a different domain can be
  built first — this ADR does not decide which.
