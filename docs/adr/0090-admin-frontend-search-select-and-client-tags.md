# ADR 0090 — admin-frontend: SearchSelect, RemoteSearchSelect and tags on the person form

Status: accepted (2026-10); frontend side of [ADR 0089](0089-clients-tags.md); a picker exception to
[ADR 0073](0073-admin-frontend-paged-list-asks-only-when-told.md) and
[ADR 0074](0074-admin-frontend-tags-list-asks-only-when-told.md), which still govern list pages

## Context

The backend stores a person's tags since ADR 0089, and the person form still sent an empty `tagIds`,
clearing them on every edit. The owner asked for a reusable selection component that takes the call
listing its items, so the same control can later pick other records loaded from the backend with
search and paging. Other screens will also need plain selections over a fixed list, with no backend
behind them. A clickable prototype was approved before planning
([spec 009](../../apps/admin-frontend/specs/009-client-tags-search-select/spec.md)).

## Decision

**Two layers.** `SearchSelect` (`shared/ui/search-select/`) composes Base UI's `Combobox` (ADR 0039)
over a list it receives as `items`: `multiple` chooses one item or several, `Chips` draw the choices and
Base UI filters the list by the typed text. It requests nothing. A source that loads its items plugs in
through optional props: `onSearchChange` hands it the typed text and turns the local filter off,
`onOpenChange` tells it when the list opens and closes, and `loading`, `failure` and `more` show its
state. `RemoteSearchSelect` (`shared/ui/remote-search-select/`) is that source for the backend: it
wraps `SearchSelect` with the loading hook and fills those props. The owner chose `SearchSelect` over
LookupSelect and EntityPicker and asked for the split so fixed selections need no backend.
`SearchSelectField` and `RemoteSearchSelectField` bind each one to React Hook Form through
`ControlledField`, like `SelectField`, which stays for the plain `Select`.

**Items are domain objects.** The component is generic over `{ id, name }`; an optional `color`
paints the chip and a dot. There is no option type or per-feature mapper: the owner turned down a
`TagOption { value, label, color }`. The value holds whole items, so the chosen ones show without
being on a loaded page, and the form converts them to ids when it submits.

**The caller supplies the call.** `RemoteSearchSelect` takes `loadItems({ search, page, pageSize },
signal)`, which returns the facade's `ApiResult<PagedResult<T>>`, the same shape as
`usePaginatedList`'s `fetchPage`; `tagsRepository.list` fits as is and the tags barrel exports it with
`NEW_TAG_PATH`. Neither component knows an endpoint.

**How the remote one asks.** The first page loads every time the list opens, so a tag created in another tab
through the empty state's link shows on reopening. Typing searches 300 ms after the last keystroke;
only typed changes search, so choosing an item does not search for its own name. "Carregar mais"
appends the next page on a click, dropping an id that shifted pages. One `AbortController`
per request, as in `usePaginatedList`: a new search, closing or unmounting cancels the pending one and
a cancelled answer is ignored. A failure shows the problem's title as received with "Tentar novamente";
a 429 gets no automatic retry.

**Base UI's own conventions stay.** With several choices, picking a search result closes the list and
clears the search, while picking with an empty search keeps it open. The limit (`maxSelected`) disables
the other options and says so.

**On the person form.** `tags` sits in "Dados da pessoa" between CPF and the notes, limited to 20 as
the backend. The schema outputs `tagIds`, so the use cases and the page hook keep receiving a
`ClientInput`. A server error on `TagIds` (`Tag.NotFound`, `Client.TooManyTags`) is moved to the `tags`
field before `applyApiProblem`, because the form field is not named after the command field. The
`tagIds: []` stopgap in `clientsRepository` is gone.

## Consequences

- Searching as the user types is the one place the frontend asks without an explicit action; list
  pages keep asking only when told.
- A tag deleted after it was listed is refused only on save, under the field.
- The single-choice mode and the fixed-list `SearchSelect` ship tested without a screen using them.
- The people list shows no tags and has no tag filter yet (ADR 0089).

## Considered and rejected

- **A `TagOption` with `value`/`label` and a mapper per feature.** Rejected by the owner: the
  domain object already has an id and a name.
- **Search only on Enter, to keep ADR 0073 literally.** Enter already toggles the highlighted item in a
  combobox; a picker that does not filter while typing would feel broken.
- **One component that always takes `loadItems`.** The first version; a fixed list would need a fake
  loader shaped like a backend answer. Replaced by the two layers before merge.
- **Infinite scroll.** More state (an observer) for no gain over an explicit click.
- **Loading the first page once per mount.** Would hide tags created in another tab until the page
  reloads.
- **Naming the form field `tagIds` so the error lands without a rename.** It would hold objects under
  an id name.
