# ADR 0076 — admin-frontend: the Pessoas filter bar, its situation filter and reusable Select/Search fields

Status: accepted (2026-10); closes point 3 of [ADR 0067](0067-admin-frontend-clients-list.md) (the situation filter
was deferred until the owner defined its control) and amends its point 9 (the screen no longer relies on an omitted
`status`); amends [ADR 0071](0071-admin-frontend-paged-list-hook.md) for Pessoas (the filter bar is a React Hook
Form form, which that ADR had turned down for the search field); consumes the contract of
[ADR 0063](0063-clients-list-and-search-contract.md); follows
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

1. **A situation select beside the search**, through a new reusable `SelectField` in `shared/form/fields`. The trigger
   carries its own label, "Situação: Ativas"; the label is a visually hidden `SelectLabel` for assistive tech, and the
   visible "Situação:" prefix is `aria-hidden` so the name is not read twice. The options are **Ativas**, **Inativas**
   and **Todas**, in that order, in the feminine because they qualify "pessoas"; they are one
   `CLIENT_STATUS_FILTER_OPTIONS` list (`{ value, label }`) in `model/clientListFilters.ts`.
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
7. **The bar is a React Hook Form form, like the other forms.** The page's hook owns
   `useForm<ClientListFilters>({ defaultValues: INITIAL_CLIENT_LIST_FILTERS })`, and the shell wraps the bar in
   `FormProvider`. The search is `<SearchField<ClientListFilters> name="search" label="Buscar pessoas por nome,
e-mail ou CPF" placeholder="…" maxLength={…} labelPlacement="inline" />` and the situation is
   `<SelectField<ClientListFilters, 'status'> name="status" label="Situação" options={…} labelPlacement="inline" />`.
   Buscar reads `getValues()` and calls `applyFilters` in the same call stack (ADR 0073), not through
   `handleSubmit`, which would defer it; the pending state compares `useWatch('status')` with the applied status;
   "Limpar filtros" is `reset(INITIAL_CLIENT_LIST_FILTERS)` and "Limpar busca" is `setValue('search', '')`. The search
   ref of ADR 0071 and the hook's own situation state are gone. Asked for by the owner on 2026-10-22, after the first
   version composed the six select parts by hand in a one-off `ClientStatusFilterSelect`.
8. **`SelectField` is configuration, not markup**, as `TextField` and `ColorField` are: `name`, `label`, `options`
   (`SelectFieldOption<V>[]`, typed by the field's value when the path is the second type argument), an optional
   `hint` and `className`. By default it renders through `FormField` (label above, hint, error, the `aria-*` wiring)
   for a form; `labelPlacement="inline"` puts the label in the trigger for a toolbar and has no hint or error line
   (the type refuses a `hint` there). It forwards `field.ref` and `field.onBlur` to the trigger, so focus-on-error
   reaches it. The paging footer's "Itens por página" still composes the select by hand: it is not a form, and the
   owner kept it out of this change.
   **`SearchField` does the same for a search text**, asked for right after: `name`, `label`, the input's own props
   (`placeholder`, `maxLength`, `autoFocus`…) and `className` for the group; the `InputGroup` with the search icon is
   inside. By default it goes through `FormField`; with `labelPlacement="inline"` the label is the field's accessible
   name only (`aria-label`), the placeholder is what shows, and there is no hint or error line. Both fields share the
   `labelPlacement`/`hint` union, so the rule is typed once. Etiquetas' `TagListSearch` still composes its own box;
   moving it is the step the `widgets/search-form` entry of ARCHITECTURE §6 now points to.
9. **Only the filter section changed.** `ClientListSearch` became `ClientListFilterBar`. `usePaginatedList`,
   `list-section` and the paging footer are untouched.

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
- **A one-off `ClientStatusFilterSelect` composing `Select`, `SelectLabel`, `SelectTrigger`, `SelectValue`,
  `SelectContent` and `SelectItem` by hand, beside an uncontrolled search ref and a `useState` for the choice** (the
  first version of this change). It worked, but every next select would repeat the six parts, and the bar did not
  follow the form pattern of the rest of the app. Replaced by `SelectField` and React Hook Form after review.
- **The label above the select in the bar too**, a single layout for `SelectField`. It changed the approved bar; the
  owner chose the `labelPlacement` prop.
- **Moving the paging footer onto the new select now.** It would prove the reuse with two consumers, but it touches
  the paging widget in a filter change.
