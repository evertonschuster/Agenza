# ADR 0070 — admin-frontend: a paged list keeps its state in the hook, not in the URL

Status: accepted (2026-10); amends [ADR 0068](0068-admin-frontend-list-pagination.md) (points 1, 3 and 5) and
[ADR 0069](0069-admin-frontend-paged-list-hook.md) (points 1 to 3); follows
[ADR 0035](0035-admin-frontend-no-server-state-library.md)

## Context

`usePaginatedList` called `useSearchParams()`, read the filters with each list's `readFilters(params)`, read the page
and the size with `readPaging`, keyed its requests by the text of the URL and rewrote the URL when it was not
canonical. It could only run as the main list of a route: a list inside a dialog would have written `?page=` into the
page behind it, and two lists on one screen would have shared one `?page=`. On 2026-10-19, going through how the
Pessoas filter worked, the owner judged that dependence on the query string not good for the application and asked
for the hook to work without it.

A first proposal kept Pessoas in the URL: a hook controlled from outside (`query`, `onQueryChange`) fed by one of two
sources, `useUrlListQuery(readFilters)` or `useLocalListQuery(initialFilters)`. The owner turned it down as extra for
now ("seja bem focado literalmente na listagem paginada") and asked for the hook alone, without either source. On
2026-10-20 the owner accepted the cost to Pessoas named under Consequences.

## Decision

1. **`usePaginatedList({ initialFilters, fetchPage })` keeps the filters, the page and the size in a `useState` of its
   own**, starting on page 1 at the default size. It imports nothing from `react-router`, and its tests run without a
   Router. What it returns is unchanged: `filters`, `setFilters`, `list` and `pagination`. `setFilters` still merges
   the patch and starts over on page 1 keeping the size, and a new size still goes back to page 1.
2. **The keys are `JSON.stringify`, not the text of the URL**: of the filters for the total, and of the filters, page
   and size for the request. A filter's value is therefore any plain data (`F extends object`), no longer only what a
   URL holds. A `Set` or a `Map` would serialize to `{}`, so filters stay plain data.
3. **A page past the last one moves to the last during render.** With no address to type, it only happens when the
   total shrinks under the page on screen. The hook adjusts its own state during render, the pattern React documents
   and the one it already used to drop an old answer, so the render with the page past the end is never committed and
   the guards that hid it are gone. The other corrections of ADR 0068 point 3 (an unreadable page, a size that is not
   offered, the `replace`) have nothing left to correct.
4. **Pessoas passes `initialFilters: { q: '' }`.** `readClientListFilters` is gone; `ClientListFilters` stays as the
   type the repository reads.
5. **URL code with no caller left is removed**: `shared/pagination/filters.ts` (`withFilters`, `ListFilters`,
   `ListFilterValue`), `readPaging`, `withPaging` and their private validation (the offset limit, the page pattern, the
   parameter names), with their tests. `paging.ts` keeps the constants, `PagedResult<T>`, `getLastPage`,
   `getVisibleRange` and `getPageWindow`.

## Consequences

- **Pessoas no longer keeps its state anywhere but the screen.** A reload starts over on page 1 with no search, a
  shared link carries neither the search nor the page, Back and Forward no longer walk through the pages, and coming
  back from `/pessoas/:id` or `/pessoas/nova` starts over too, because those routes are siblings of the list, which
  unmounts. Accepted by the owner on 2026-10-20. ARCHITECTURE §1's rule that state a person expects to survive a
  reload belongs in the URL now names paged lists as the exception.
- The criteria of #155 still hold: changing the search starts over on page 1, and the size is kept between pages.
- `useClientListPage`, `ClientListPage`, `ClientListSearch`, the repository and `PaginatedListSection` are otherwise
  unchanged.
- Tests: the hook's run without a Router, over a filter of each kind plus a number. The page's reach their state by
  clicks; those of behaviour that no longer exists are gone (Back and Forward, reading `?q=`, `?page=` and
  `?pageSize=`, unreadable values, the `replace`), and one pins that an address carrying `?q=`, `?page=` and
  `?pageSize=` is ignored. The page past the end is now a total that shrank. The e2e paging suite searches through the
  form, and its reload, Back and `?page=99` tests are gone. The e2e suite was not run against the stack, and the
  change was not checked in a browser.
- Bringing the URL back, for Pessoas or for a list that needs a link, means giving the hook a source for its state;
  the fetch, the answer, the total and the retry would not change. The first option below is where that starts.

## Considered and rejected

- **A controlled hook fed by two sources** (`useUrlListQuery`, `useLocalListQuery`). It kept Pessoas in the URL and
  made a list outside the URL possible; the owner turned it down as extra for now.
- **The page's own hook wiring `useSearchParams` to a controlled hook.** The reading of the URL would stay, which is
  what the owner asked to leave out.
- **A flag, `storage: 'url' | 'memory'`.** Two modes in one function, and the Router still needed by both.
- **A prefix per list in the URL** (`?clientsPage=`). It solves two lists on one screen and nothing else.
- **Keeping `filters.ts`, `readPaging` and `withPaging` for a later return of the URL.** Code with no caller; git and
  this ADR keep the way back.
