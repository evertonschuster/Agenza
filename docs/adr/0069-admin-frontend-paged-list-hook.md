# ADR 0069 — admin-frontend: one hook for paged lists

Status: accepted (2026-10); amends [ADR 0068](0068-admin-frontend-list-pagination.md) (points 4 and 5) and the rule of
`apps/admin-frontend/AGENTS.md` that hooks are not shared between pages; follows
[ADR 0033](0033-admin-frontend-no-request-cancellation-layer.md) and
[ADR 0035](0035-admin-frontend-no-server-state-library.md) (a TanStack Query proof of concept for the lists was turned
down on 2026-10-15); amended by [ADR 0070](0070-admin-frontend-paged-list-state-in-the-hook.md) (points 1 to 4 and 6:
the state is in the hook, not in the URL, and a request is told apart by the state object itself)

## Context

`useClientListPage` had grown to 124 lines doing eight things, only two of them about people: reading `?q=`,
`?page=` and `?pageSize=`, fetching with an abort, deciding which answer is the current one, keeping the last total for
the footer, moving a page past the last one, keeping the search field in step with the URL, the handlers, and turning
the `ApiResult` into the state of the list. On 2026-10-15 the owner asked for a way to reuse it in the next paged lists,
whose filters will differ: a search term only, flags, a single choice, several choices, several fields. The shape had
also produced three defects:

- The answer on screen was chosen by comparing values (`isSameRequest`). Going A → B → A before B answered put A's old
  answer back on screen as if it were new, while A was being asked again. A one-line fix was committed and then set
  aside "until the cause is understood"; this was the cause.
- The total the footer kept while a page loaded was the last total of any request. Back from a search with one result
  to page 3 of everyone showed "Exibindo 41–1 de 1 pessoa" until the answer arrived.
- A new filter had to be added in four places (the reading of the URL, `isSameRequest`, the handler that starts over on
  page 1, the repository), and forgetting `isSameRequest` failed no test.

The shape below was reached in conversation with the owner, who turned down each heavier version in turn, and one
round of questions before any code.

## Decision

1. **A generic `usePaginatedList` in `widgets/paginated-list-section/`**, exported by the barrel beside
   `PaginatedListSection`, whose props it produces. It takes two functions: the list's `readFilters(params)` and the
   repository's `fetchPage(query, signal)`. It returns `filters`; `setFilters(patch)`, which writes to the URL, starts
   over on page 1 and keeps the size; `list` (`status`, `items`, and a `failure` that already carries its `onRetry`),
   which the page spreads into `PaginatedListSection`; and `pagination` (`page`, `pageSize`, `totalCount` and the two
   callbacks), to which the page adds its `itemLabel`. The hook owns the reading and writing of the URL, the fetch and
   its abort (the effect's cleanup), the answer to the current request, the total, the correction of the URL and the
   retry. The page keeps its own hook, so a page is still a shell, and that hook keeps what belongs to the page: for
   Pessoas, the uncontrolled search field (a ref and an effect, which the owner kept over React Hook Form) and the
   `search` of the empty state. This is the second exception to "hooks are never shared between pages", after a pure
   context accessor: a generic hook with no domain, in `widgets/`. A page's hook is still never imported by another
   page.
2. **Each list declares its filters as an interface and a plain function that reads them from the URL**, in its
   `model/` (`ClientListFilters`, `readClientListFilters`), using `URLSearchParams` directly, the way `readPaging` reads
   the size. A value the list does not know reads as empty (`''`, `null`, `false`, `[]`), and the hook rewrites the URL
   with a `replace`, as ADR 0068 point 3 already does for the page. A filter is named in the URL after its property
   (`q`), and the repository maps it to the name the API reads (`Search`). A filter's value is a `string`, a `string[]`,
   a `boolean` or `null`.
3. **The writing is shared**: `withFilters(params, filters)` in `shared/pagination/filters.ts`, beside `withPaging`. An
   empty text, `null`, `false` and `[]` leave the URL; `true` is written `1`; a list repeats its name
   (`?tag=a&tag=b`). A value is changed where it already is, and a list holding the same values is left in place, so
   the correction never reorders the URL. Each list writes only its reading.
4. **The answer on screen is the answer to the current request.** When the request changes, the previous answer is
   dropped (a state reset during render, the pattern React documents for it), so coming back to a request shows the
   skeleton until its new answer arrives.
5. **The total belongs to the filters it was counted for.** Changing the page or the size keeps the footer, on the last
   total, while the page loads (ADR 0068 point 4, unchanged). A new search or filter, Back or Forward to other filters,
   and the first load draw the footer as a skeleton: `PaginationSkeleton`, built on the same three-part
   `PaginationLayout` as the footer and hidden from assistive tech. A failure still has no footer. The owner, on
   2026-10-15: on a change of page keep the numbers, and while filtering show it loading too, with a skeleton. Drawing
   it on the first load as well is the agent's reading, since it is the same state (no total for these filters); before,
   there was no footer until the first answer.
6. **A retry raises a counter the fetch effect depends on**, instead of calling the fetch from a handler. The effect
   reads the current query through `useEffectEvent`, so the functions a caller passes need not be stable.
7. **Only Pessoas moves onto the hook**, with `q` alone and no new filter on screen. Etiquetas does not page and stays as
   it is. The next paged list (Serviços) writes an interface, its reading and its own filter bar.

## Consequences

- `useClientListPage` goes from 124 lines to about 35, and its types from five declarations to one. `ClientListQuery`
  is `ClientListFilters & Paging`, so its field is `q`, no longer `search`.
- An empty `?q=` is now removed from the URL by a `replace`; before, it stayed.
- The footer's skeleton takes the footer's place before the first answer, so the footer no longer appears under the
  table only when the numbers arrive.
- The barrel of `paginated-list-section` exports a hook, so `react-refresh/only-export-components` warns on it, as it
  already does on `badge`, `button` and `toast`.
- The filter bar is not generic: each list writes its own. `widgets/search-form` still waits for a third copy of the
  form (ARCHITECTURE §6).
- Covered by the page's tests (four new ones fail with either fix removed), the hook's own tests over a flag, a list
  and a choice, and `withFilters`'s; not checked in a browser.

## Considered and rejected

- **A schema with inferred types** (`defineFilters({ q: text(), status: choice([...]) })`), one declaration for the
  type and the reading. The owner asked what the inference was needed for: it saves writing the type once, at the cost
  of a small framework of mapped types to learn and keep.
- **A helper per kind of filter** (`readText`, `readChoice`). Each is one line of `URLSearchParams`; a rule repeated in
  three lists (a UUID check) becomes shared then.
- **Zod as the reader.** It reads, but does not write back, nor handle a repeated parameter.
- **The filter bar owning the reading of the URL.** The hook needs the filters before that component exists (the first
  request of a link opened directly) and when Back changes the URL with nobody touching it, and the repository
  (`api/`) needs their type, which a component in `ui/` could only give by inverting the slice.
- **The filter form inside the hook**, and **React Hook Form for the search field.** The owner kept the field as it was.
- **Keeping the last total while a new search loads** (ADR 0068 point 4 as it stood). It shows numbers that belong to
  another search.
- **A server-state library**: the TanStack Query proof of concept, turned down on 2026-10-15. **A route `loader`**:
  tried and reverted for Etiquetas, because it made the list's skeleton unreachable (ARCHITECTURE §5).
