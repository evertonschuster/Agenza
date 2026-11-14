# ADR 0093 — admin-frontend: creating an item from the SearchSelect

Status: accepted (2026-11); amends [ADR 0091](0091-admin-frontend-search-select-and-client-tags.md), whose
"this change only selects" no longer holds; the rest of 0091 stands

## Context

Picking tags on the person form ([ADR 0091](0091-admin-frontend-search-select-and-client-tags.md)) left a
gap: a tag that does not exist yet had to be created on the Etiquetas page, leaving the person form. The
owner asked for a quick way to create it from the picker itself, without changing screens or opening a
tab, as a capability of the generic `SearchSelect` that other pickers can reuse. Three clickable prototypes
were compared before planning
([spec 010](../../apps/admin-frontend/specs/010-search-select-inline-creation/spec.md)).

## Decision

**An optional `creation` on the `SearchSelect`.** The caller gives the action's label, the label with the
typed text, and a `render(request)` that draws the creation; the request carries the text to start from,
`finalFocus()` returning the search input, and `complete(item)` / `cancel()`. The picker offers the entry points, passes the text and adds the item it
gets back to the value; it never knows what it is creating. Both labels come from the caller because
Portuguese inflects them ("Nova etiqueta", "Novo serviço"). Without `creation`, the picker is the one of 0091. `SearchSelectField` passes the prop through unchanged.

**Two entry points.** A button with an icon and the action's label inside the field, before the trigger,
reachable by Tab right after the search and usable with the list closed; and a row between the list and
the selection footer, visible at any scroll position, while loading, after a failure and with no result,
outside the Tab order like the other popup buttons. The row says "Criar etiqueta «texto»" while text is
typed and no shown result has that name, ignoring case and accents; otherwise it says the plain action and
the creation starts empty. The button passes the same text but keeps its label. At the selection limit
both are unavailable; the button stays focusable and is described by the limit notice.

**The list is controlled and the creation renders outside the Combobox.** Starting a creation closes the
list, and Base UI clears the typed text once a multiple combobox finishes closing, so the picker does not
control the text. `render(request)` is a sibling of the `<Combobox>`: React events climb the component tree
even out of a portal, and inside the Combobox they would reach the chips' press handler and the input's
keys. It is drawn by a small slot component, so the request's callbacks, which read the field's DOM, reach
the caller as props rather than through a call made during the picker's render, which the React Compiler
rules reject. A button inside `Combobox.Chips` is safe: the chips' `mousedown` handler ignores interactive targets,
and the outside-press check treats the chips as inside, so the button neither focuses the search nor opens
or closes the list by itself. Completing or cancelling unmounts the creation synchronously and focuses the
input, found inside the picker's own anchor so the form's `inputRef` is passed on untouched. A Base UI
dialog then returns focus to the control that opened it, the field button, so a dialog passes
`finalFocus` to its `DialogContent`; `TagFormDialog` takes it as an optional prop.

**One tag form, two dialogs.** The tag schema, fields and title move out of the Etiquetas page folder to
`features/tags/ui/components/TagForm/`, with a `TagFormDialog` shell (dialog, form provider, header, body,
footer) used by the route page and by a new `TagCreateDialog`. The page keeps its hook: route id, loading
for edit, closing by navigation. `TagCreateDialog` has its own: the received name, a palette color
suggested from the name (`suggestTagColor`) that follows the name until a color is picked, the same
`createTag` and `applyApiProblem`, the "Etiqueta criada" toast saying the tag was also selected, and
`onCreated` / `onCancel` instead of navigation. Its submit stops propagation: in the React tree the dialog's
`<form>` sits inside the person's, and saving the tag would otherwise submit the person.

## Consequences

- The person form creates a tag from the button or from a search with no result, and the tag is selected
  at once; the backend is unchanged, since `POST /tags` already existed.
- A duplicate name the picker could not see in the loaded results is refused by the server and shown in
  the dialog, as on the Etiquetas page.
- Cancelling returns focus to the field with the search cleared, like Escape and Tab.
- While the list is open, Base UI hides from assistive technology everything but the search and the popup,
  the field button included; there the row is the way to create, and Tab closes the list and reaches the
  button.
- A keyboard user reaches the button through Tab, which closes the list and clears the search, so the
  dialog opens without a name.
- The Etiquetas page shows no suggested color; it still starts with none checked.

## Alternatives

- **Create on the spot with an automatic color.** One Enter, but the color could only be fixed later on
  the Etiquetas page.
- **A small form inside the popup.** Moves focus from the search to popup buttons that are outside the Tab
  order.
- **A "Criar «texto»" option inside the list.** Reachable by arrows, but tied to searching first; the owner
  chose the footer row, which carries the typed text and also works without a search.
- **A "Nova etiqueta" link under the field.** Each screen would add it on its own; left out by the owner.
- **Opening the Etiquetas route dialog.** `/tags/new` would unmount the person form and lose what was typed.
- **One configurable dialog for the route and the picker.** Mixes route concerns (loading by id, closing by
  navigation) with the picker's callbacks; two thin hooks over one shell keep each simple.
- **Merging the form's `inputRef` with a ref of the picker.** Assigning to a received ref breaks the React
  Compiler rules; the anchor the picker already owns finds the input.
- **Restoring the typed text after cancelling.** Would require controlling the input text that Base UI
  clears on close. Declined by the owner.
- **A "Criar e selecionar" submit label.** The dialog keeps the shared footer's "Salvar", the owner's
  choice.
- **An announcement of its own in the picker.** The toast already announces the creation; the picker would
  need one more caller label for it.
