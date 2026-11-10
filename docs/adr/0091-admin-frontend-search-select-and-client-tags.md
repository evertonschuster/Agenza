# ADR 0091 — admin-frontend: SearchSelect and tags on the person form

Status: accepted (2026-11, redesigned before merge); frontend side of [ADR 0089](0089-clients-tags.md);
a picker exception to [ADR 0073](0073-admin-frontend-paged-list-asks-only-when-told.md) and
[ADR 0074](0074-admin-frontend-tags-list-asks-only-when-told.md), which still govern list pages; the move
of `TagIds` errors to `tags` amended by [ADR 0092](0092-admin-frontend-form-fields-submitted-under-another-name.md)

## Context

The backend stores a person's tags since ADR 0089, and the person form still sent an empty `tagIds`,
clearing them on every edit. The owner asked for a reusable selection component that takes the call
listing its items, so the same control can later pick other records loaded from the backend with
search and paging. A clickable prototype was approved before planning
([spec 009](../../apps/admin-frontend/specs/009-client-tags-search-select/spec.md)).

A first version shipped on the branch in two layers, a fixed-list `SearchSelect` and a
`RemoteSearchSelect` around it. Reviewing it, the owner found it too complex for what it does and asked for
the component to be rewritten from scratch, focused on the backend case.

## Decision

**One component, `SearchSelect`, in `shared/ui/search-select/`.** It picks several items from a list it
loads through the caller's function, and works on its own, controlled by `value` and `onValueChange`,
named by `aria-label` or by a label bound to its `id`, one of which its props require. `SearchSelectField`
in `shared/form/fields/` binds it to React Hook Form through `ControlledField`, like `SelectField`, and adds
no behavior; its props follow the other fields, a form path for `name` and the form as the only type
parameter. A first version narrowed `name` to paths holding a list of the items, through a type of its own
and a second type parameter; the owner had it removed so the field keeps the contract shared by every
field in `shared/form/fields`. Both stay in
`shared` with the other form controls; the request itself belongs to the feature, which passes the call.
The redesign first called it `RemoteSelect`; the owner renamed it `SearchSelect` before merge, since the
name should say what the field does rather than where its data comes from, and with the fixed-list picker
gone the name no longer clashes with another component. The owner also chose to leave out both a
fixed-list picker and the single-choice mode until a screen needs them.

**Built on the generated Combobox parts.** `shared/ui/combobox/` takes back from the shadcn `base-nova`
registry the parts removed when only the command palette used it: popup content with an anchor, chips,
chip, chips input, trigger and item indicator, adapted to the project's focus ring, the `.tag` colours and
a required name for each chip's remove button, plus Base UI's `Combobox.Status`. `SearchSelect` composes
them and owns three rules.

**Items are domain objects.** The component is generic over `{ id, name }`; an optional `color` paints the
chip and the option with the shared `.tag` class. There is no option type or per-feature mapper: the owner
turned down a `TagOption { value, label, color }`. The value holds whole items, so the chosen ones show
without being on a loaded page, and the form converts them to ids when it submits.

**The caller supplies the call.** `loadItems({ search, page, pageSize }, signal)` returns the facade's
`ApiResult<PagedResult<T>>`, the same shape as `usePaginatedList`'s `fetchPage`; `tagsRepository.list`
fits as is and the tags barrel exports it. The component knows no endpoint.

**How it asks.** `useSearchOptions` decides what to show and when to ask, without knowing Base UI, and
asks only from events, never from an effect on the typed text:

- The first page loads every time the list opens, so tags created or renamed elsewhere show without
  reloading the page, unless a typed search is waiting, which then loads alone.
- Typing searches 300 ms after the last keystroke; only typed changes search, so choosing an item does
  not search for its own name.
- The answer for a page that has a successor stores that successor's query, ready to send. Scrolling to
  40 px from the end of the list sends it, and so does a list still shorter than its height after a page
  arrives; an id that shifted pages is dropped. The last page comes from the page size the server
  answered. One page at a time: nothing more is asked while a request runs, while a typed search waits,
  from a render older than the page that just arrived, or after a failure.
- A failure shows the problem's title as received with "Tentar novamente", below the list, where a failed
  next page was asked; it repeats the failed page or, with none, the first page of the same search. A 429
  gets no automatic retry.
- One `AbortController` per request: a new request, closing or unmounting cancels the pending one, and a
  cancelled answer is ignored. The list is dropped once the closing animation ends, so the popup does not
  turn into a skeleton while it fades out.

Under the list, "Mostrando X de Y" turns into "Carregando mais…" while a page loads; below it, the count of
choices and "Limpar seleção". The limit (`maxSelected`) disables the other options and says so. Inside the
popup, one `Combobox.Status` announces "Carregando opções…", "Carregando mais opções…" and the limit, and
Base UI announces it even when it mounts already holding text; the footer and the limit notice are plain
text, so a screen reader hears each change once. `Combobox.Empty`, also a live region, stays mounted with
only its text switched, as Base UI requires: removed while loading, it let Escape leak to a parent dialog.
A failure is an alert. The list carries `aria-busy` while a page loads. The search field takes the
caller's `maxLength`; the person form passes the tags search limit.

**The keyboard keeps the form and the choices.** The input's `onKeyDown`, which Base UI runs before its
own, reads the state Base UI already puts on the input:

- Base UI lets Enter through to the form when no option is highlighted, and nothing is highlighted
  automatically here, by the owner's choice. With `aria-expanded="true"` and no `aria-activedescendant`,
  or with Shift, Ctrl, Alt or Meta held (Base UI ignores a modified Enter), the handler calls
  `preventDefault()`, which cancels the browser's implicit submission, and `preventBaseUIHandler()`, so the
  list stays open. An unmodified Enter on a highlighted option is left to Base UI. Closing the list clears
  the typed text in this mode, so a closed field is empty and Enter there submits.
- With the list closed, Base UI's Escape clears every choice and stops the key. The handler skips Base
  UI's handler there, so the choices stay and the key reaches whatever is around, such as a dialog. With
  the list open, Escape is left to Base UI, which closes only the list.

**Base UI's own conventions stay.** Picking a search result closes the list and clears the search, while
picking with an empty search keeps it open.

**On the person form.** `tags` sits in "Dados da pessoa" between CPF and the notes, limited to 20 as the
backend. The schema outputs `tagIds`, so the use cases and the page hook keep receiving a `ClientInput`. A
server error on `TagIds` (`Tag.NotFound`, `Client.TooManyTags`) is moved to the `tags` field before
`applyApiProblem`, because the form field is not named after the command field (since ADR 0092 through the
`aliases` of `applyApiProblem`, which replaced the form's own `toClientFormProblem`). The `tagIds: []` stopgap in
`clientsRepository` is gone.

## Consequences

- Searching as the user types and loading the next page on scroll are the places where the frontend asks
  without an explicit action, both inside this picker; list pages keep asking only when told.
- A tag deleted after it was listed is refused only on save, under the field.
- A fixed list of options or a single choice needs a new component or mode, decided with the screen that
  asks for it; `SearchSelect` is not meant to grow into a base for them.
- The people list shows no tags and has no tag filter yet (ADR 0089).

## Considered and rejected

- **Two layers: a fixed-list `SearchSelect` with `RemoteSearchSelect` around it.** The version first
  built on this branch, replaced before merge; its base's name was later reused for the new component. The fixed list carried the remote one's states (loading,
  failure, more pages, scrolling), switched its filter and highlight off when it received `onSearchChange`,
  and the single/multiple union was restated in three type files.
- **Neutral extension points on a fixed-list base.** Renaming those props (`status`, `footer`,
  `onListEndReached`, a local-filter switch) kept the same coupling: none of them is used by a fixed list.
- **Mirroring `open`, the typed text and the highlighted item in state for the Enter rule.** The first
  version did; the input's ARIA attributes already carry them.
- **Enter searching at once instead of waiting 300 ms.** Shipped in the first version; dropped in the
  redesign, since it needed its own path through the component for little gain.
- **Keeping Base UI's Escape, which clears every choice when the list is closed.** Found by the critical
  review of the redesign: one Escape after picking a search result wiped the person's tags, and inside a
  dialog it ate the key that should close it.
- **A `role="status"` on each message (limit, loading, "Mostrando X de Y").** Several live regions, some
  mounted already holding their text, so screen readers either chattered or missed them.
- **Blocking Enter on the `<form>` or cancelling in `onSubmit`.** Either would touch every field of the
  form and need to tell which input or button started the submission; the picker owns its own key.
- **Highlighting the first result.** Would make Enter after a search pick that result. Declined by the owner.
- **Search only on Enter, to keep ADR 0073 literally.** Enter already toggles the highlighted item in a
  combobox; a picker that does not filter while typing would feel broken.
- **"Carregar mais" on a click.** The first version, replaced at the owner's request by loading on scroll.
- **An `IntersectionObserver` on a sentinel after the last item.** It reports only changes of intersection,
  so a sentinel that stays visible after a short page never fires again, and the list renders its items
  from a function, leaving no natural place for a sentinel.
- **Loading the first page once per mount.** Would hide tags created or renamed elsewhere until the page
  reloads.
- **A link to create a tag from the empty list.** Drawn in the prototype, then removed by the owner: this
  change only selects; creating tags stays on the Etiquetas page.
- **`widgets/` for the component and its Field.** Closer to `usePaginatedList`, but it would take the Field
  out of `shared/form/fields`, where every form control lives, for a component whose request is the
  feature's.
- **A `TagOption` with `value`/`label` and a mapper per feature.** Rejected by the owner: the domain object
  already has an id and a name.
- **Naming the form field `tagIds` so the error lands without a rename.** It would hold objects under an
  id name.
