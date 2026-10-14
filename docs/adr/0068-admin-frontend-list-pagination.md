# ADR 0068 — admin-frontend: paged lists

Status: accepted (2026-10); completes the paging that [ADR 0067](0067-admin-frontend-clients-list.md) (point 3) left to
the owner; consumes the paged-list contract of [ADR 0063](0063-clients-list-and-search-contract.md) and
[ADR 0064](0064-paged-reads-page-request-and-paged-result.md); amends
[ADR 0042](0042-admin-frontend-widgets-layer-and-layer-boundaries-rule.md) (a widget may compose another widget);
follows [ADR 0033](0033-admin-frontend-no-request-cancellation-layer.md) and
[ADR 0035](0035-admin-frontend-no-server-state-library.md)

## Context

ADR 0067 shipped the Pessoas list with search only: the screen listed the first page (20 people) and nothing on it said
there were more. The owner kept the paging controls for themselves ("the owner defines the select and the paging
controls separately"). On 2026-10-14, right after #177 merged, the owner asked for them, with one condition: minimally
generic, so the next paged list (the services API already pages; Etiquetas does not) reuses the same parts. The owner
told the agent to ask on every doubt instead of assuming, and decided each point below, in answer to questions, before
any code. The backend half needed nothing: `page` from 1, `pageSize` from 1 to 100 (default 20), the answer
`{ items, totalCount, page, pageSize }`, a stable order, and a page past the last answering `200` with empty `items` and
the real total (ADR 0063, ADR 0064).

## Decision

1. **The state is in the URL**, beside `?q=`: `?page=` and `?pageSize=`. The defaults (page 1, 20 a page) are left out,
   so an untouched list has an untouched URL. Changing the page or the size is a normal navigation, so Back and Forward
   walk through the pages. Submitting or clearing the search starts over on page 1 and keeps the size (#155: "alterar
   busca/filtro reinicia na página 1; manter os valores ao navegar entre páginas").
2. **The footer** sits under the table:
   - a summary, "Exibindo 21–40 de 87 pessoas" (one item reads "Exibindo 1 de 1 pessoa"; numbers in the Brazilian way,
     "1.234"), in a `role="status"` region. The owner had removed an earlier "Exibindo 20 de 87" line because nothing
     could move the page then; it came back with the controls;
   - a select, **Itens por página**, with 10, 20, 50 and 100 (the default stays 20; 100 is the backend's limit);
   - the pager, **Anterior**, the page numbers around the current one with gaps ("1 … 4 [5] 6 … 22", never wider
     than seven slots, `aria-current="page"` on the current one) and **Próxima**. Below the `sm` breakpoint the numbers
     give way to "Página 5 de 22" between the two buttons.

   Choosing another size goes back to page 1. Derived from "do not show a control that does nothing": no footer without
   an item, no select while even 10 a page would show everything (10 items or fewer), no pager with a single page.

3. **A page or size that cannot be shown is corrected, without a notice.** An unreadable `?page=` (not a positive
   integer, or one whose offset `(page - 1) * pageSize` would not fit the `int` the backend counts in) reads as page 1,
   and a `?pageSize=` that is not one of the four sizes reads as 20; both are rewritten out of the URL. A page past the
   last one (hand-typed, or the total shrank while the person was on the last page) goes to the last page that exists.
   The rewrite is a `replace`, so Back never returns to the page that did not exist. Without this, the `200` with empty
   `items` would have rendered as "Nenhuma pessoa ainda". While it moves, the screen shows the skeleton, not an empty
   list.
4. **While a page loads**, the screen does what a new search already did: the skeleton takes the table's place, and the
   footer stays, on the last known total, with every control disabled (the buttons by `aria-disabled`, so keyboard focus
   is not lost; the select by `disabled`). Before the first answer, when the total is unknown, and after a failure there
   is no footer. Changing the page moves neither the scroll nor the focus.
5. **The reusable parts:**
   - `shared/pagination/paging.ts`: the contract of `?page=`/`?pageSize=` as pure functions and constants (`readPaging`,
     `withPaging`, `getLastPage`, `getVisibleRange`, `getPageWindow`, `PAGE_SIZE_OPTIONS`, `DEFAULT_PAGE_SIZE`) and the
     generic `PagedResult<T>`; tested without mocks;
   - `shared/ui/select`: Base UI's Select through the shadcn CLI, trimmed to the five parts the footer uses (label,
     trigger, value, content, item). The owner chose it over a native `<select>` and over segmented buttons;
   - `widgets/pagination`: the footer, with the noun passed as `itemLabel: { singular, plural }`, the way a list passes
     its `emptyCopy`;
   - `ListSection` gains an optional `pagination` (`null` or absent means the list does not page). It decides when the
     footer shows, from `status`: never on a failure, disabled while loading. The page passes the numbers, the noun and
     the two callbacks, as it already passes `failure` with its `onRetry`;
   - each list's own hook ties `useSearchParams` to those functions (about ten lines), because hooks are not shared
     between pages (AGENTS.md). The owner kept that rule over a generic `usePagination`.
6. **A widget may import another widget**, never in a cycle: `list-section` renders `pagination`. ADR 0042 and
   ARCHITECTURE §1 said a widget imports only `shared/`; the lint rule never enforced it (it reports only an import into
   a higher layer), and the owner chose to change the sentence rather than keep a slot or bury the footer inside
   `list-section/components/`, which sits outside the coverage gate.
7. **The repository always sends `Page` and `PageSize`**: `clientsRepository.list({ search, page, pageSize }, signal)`.
   The screen no longer depends on the backend's defaults, and it still sends no `Status` (ADR 0067, point 9). The
   model is `ClientList = PagedResult<ClientListItem>`; `list` still forwards the answer verbatim.

## Consequences

- Acceptance criteria of #155 now met: the paging, "alterar busca reinicia na página 1", and values kept between pages.
  "Navegação entre páginas não repete nem omite registros" is the backend's order (name, then id) and holds while the
  data does not change; the count and the page are two statements without a transaction (ADR 0063), so with a
  concurrent write the summary can say "81–87 de 87" for an instant that is already 88. Still open from ADR 0067: the
  situation filter as a choice on screen.
- The situation filter will need no change in `withPaging`: it keeps every parameter it does not own, so `?status=` is
  carried along; the filter's handler resets the page the way the search does.
- Etiquetas does not page (its API does not), so `TagListPage` is untouched. The Serviços screen is still "Em breve";
  its list will pass `pagination` and the noun and write the ten lines of hook.
- The page size is not remembered between visits (nobody asked for it): the URL is the only state, as for the search,
  and `localStorage` stays with the session and the theme.
- `shared/ui/select` is in the coverage gate and is exercised through the footer's tests.
- A page button is a `<button>`, not a link: it cannot be opened in a new tab.

## Considered and rejected

- **"Página X de Y" with « ‹ › »** (the shadcn data-table style) and **a "go to page" field.** The owner chose numbered
  pages.
- **A native `<select>`** (second kind of select in the app once the situation filter arrives) **and segmented
  buttons** (do not fit a phone).
- **A shared `usePagination` hook.** Kept to the rule that hooks are not shared between pages.
- **A `footer` slot on `list-section`**, and **the footer inside `list-section/components/`.** The first splits the
  visibility rule between page and widget; the second only serves `list-section` and leaves the logic out of coverage.
- **Keeping the old rows, dimmed, while the next page loads.** Needs a "ready and refreshing" state.
- **A toast, or an empty "this page does not exist" state with a button, for a page that cannot be shown.**
- **Keeping the first item on screen when the size changes** (page 3 of 20 is the 41st item, which is on page 1 of
  50). Back to page 1 is simpler and predictable.
- **Rolling to the top of the list and moving the focus when the page changes.** Not wanted.
