# ADR 0076 — admin-frontend: the Pessoas filter bar and its situation filter

Status: accepted (2026-10); closes point 3 of [ADR 0067](0067-admin-frontend-clients-list.md) (the situation filter
was deferred until the owner defined its control) and amends its point 9 (the screen no longer relies on an omitted
`status`); consumes the contract of [ADR 0063](0063-clients-list-and-search-contract.md); follows
[ADR 0072](0072-admin-frontend-paged-list-state-in-the-hook.md) and
[ADR 0073](0073-admin-frontend-paged-list-asks-only-when-told.md)

## Context

`GET /api/v1/clients` reads four parameters: `page`, `pageSize`, `search` and `status` (`active`, `inactive` or `all`).
The Pessoas screen sent the first three; `status` stayed out because ADR 0067 left the situation filter to a control the
owner would define, and made an omitted `status` list everyone so that a deactivated person would not vanish.

The owner defined the control on 2026-10-22, from two rounds of a clickable prototype, and asked for the search box to
change with it: with more than one filter, a **Buscar** button inside the text field no longer says what it applies.
The bar was designed for several filters, although the backend has only the situation today.

## Decision

1. **A situation select beside the search**, on the `shared/ui/select` that the paging footer brought. The trigger
   carries its own label, "Situação: Ativas"; the label is a visually hidden `SelectLabel` for assistive tech, and the
   visible "Situação:" prefix is `aria-hidden` so the name is not read twice. The options are **Ativas**, **Inativas**
   and **Todas**, in that order, in the feminine because they qualify "pessoas".
2. **The screen opens on Ativas.** `INITIAL_CLIENT_LIST_FILTERS` is `{ search: '', status: 'active' }`, and the
   repository always sends `Status`, `all` included, so the screen does not depend on the backend default. The backend
   keeps ADR 0067's default (`all` when omitted); nothing in the contract changes.
3. **One Buscar button at the end of the row applies everything.** The bar is one form: picking a situation does not
   ask the backend; **Buscar**, or Enter in the search field, applies the term and the chosen situation together and
   goes back to the first page (`applyFilters`, ADR 0073). While a chosen situation differs from the applied one,
   Buscar takes the primary style, so a pending choice is visible.
4. **"Limpar filtros" appears when the applied filters differ from the opening ones** (a term or a situation other
   than Ativas). It empties the field, puts the select back on Ativas and applies the opening filters, keeping the page
   size. A choice that was not applied yet does not show it.
5. **"Limpar busca" in the empty state keeps working as before**: it empties only the term and keeps the applied
   situation. The empty-state copy does not change with the filter.
6. **On a list area narrower than 560 px** (the `@pagination` container width of the footer), each control takes a
   whole line: field, select, Buscar, Limpar filtros. Wider, they share one line and wrap. On a touch screen the
   controls are 44 px tall, as in the footer.
7. **Only the filter section changed.** `ClientListSearch` became `ClientListFilterBar`, with the select in
   `ClientStatusFilterSelect`; the hook keeps the uncontrolled field and holds the chosen situation in its own state.
   `usePaginatedList`, `list-section` and the paging footer are untouched.

## Consequences

- The acceptance criteria of #155 left open by ADR 0067 are met: an inactive person appears when the filter includes
  her, and changing the search or the filter starts over on page 1.
- **Accepted by the owner: opening on Ativas with the empty state as it was.** A search for an inactive person under
  Ativas answers "Nenhuma pessoa encontrada para «x»", and a business whose people are all inactive sees "Nenhuma
  pessoa ainda". Both were shown in the prototype; the person changes the situation to find them.
- Picking a situation costs one more click (Buscar) than applying on choice. It keeps one rule for the whole bar when
  more filters arrive.
- On a phone, each new filter adds a line above the list. With a second real filter, gathering the filters behind one
  button that opens a `shared/ui/sheet` is the expected next step, not part of this change.
- The page test checks what the screen asks for (`status` in each request) and what the bar shows; its fake backend
  does not filter by situation, which is the backend's job and is covered by ADR 0063's tests.

## Considered and rejected

- **Segmented buttons, tabs, or a "Filtros" button with a popover** as the control. The segmented buttons and tabs
  needed a new primitive; the popover hides the state and is more structure than one filter needs.
- **Opening on Todas**, which kept the behaviour of ADR 0067. The owner chose Ativas, the people of day-to-day use.
- **A select with a visible label beside it, or only the value in the trigger.** The label in the trigger keeps the
  control self-explanatory on one line and in the narrow layout.
- **On a phone, the select on the same line as the search.** It cut the search placeholder to about half.
- **Buscar beside the search, applying only the term, with each select applying on choice; or no button at all.** With
  several filters, a button that applies only one of them is ambiguous, and Enter alone gives no visible cue.
- **An empty-state copy per situation and a "Limpar filtros" action in it.** Turned down for now; the bar's own
  "Limpar filtros" covers going back to the opening filters.
