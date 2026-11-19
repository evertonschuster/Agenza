# Decisions: frontend

Current shape and conventions:
[apps/admin-frontend/docs/ARCHITECTURE.md](../../apps/admin-frontend/docs/ARCHITECTURE.md).

## Architecture and data access

### Decision

- **No cancellation layer in the facade.** Whoever asks for the data cancels it: the list widget and
  the session. Whoever cancels checks its own signal before applying the answer.
- **No server-state library for now.** It comes in on a concrete trigger: a cache reused across
  screens, data that survives navigation, or revalidation and synchronization the current shape
  cannot handle. When it comes in, it replaces the repository.
- **A list fetches only when asked**, never through an effect keyed on the query; when it asks is
  described in §1 of the [frontend guide](../../apps/admin-frontend/docs/ARCHITECTURE.md).
- **A `429` is a problem of its own** (`RATE_LIMIT_PROBLEM`), with a frontend message. No automatic
  retry and no countdown; the existing manual retry is enough.
- **The page header and breadcrumb come from the routes** (`handle: crumb(...)`), with an arrow to the
  level above.

### Rejected

- **neverthrow or Effect**, for something that fits in a few lines.
- **Remembering or carrying the list's search through the menu link** (`destinationTarget`, search
  per destination). Refused twice by the owner; the link opens the list without filters.
- **TanStack Query, SWR or RTK Query now.** A TanStack proof of concept was refused too.
- **A cancellation layer in the facade**, such as a request registry or a controller it owns. The
  repositories only forward the consumer's optional `signal`.
- **Triggering the fetch through an effect keyed on the query**, `useFetcher().load()`, or a promise
  with `use()` and Suspense. They revalidate on their own, or restructure the screen.
- **A filter schema with inferred types**, Zod as the reader or a storage flag `url | memory`. Too much
  structure for filters that read in one line.
- **A countdown on the retry button or automatic backoff in the facade.** It was built and removed at
  the owner's request.
- **A breadcrumb declared in each page** and an arrow going back through history.
- **A separate `renameFieldErrors`, composed before `applyApiProblem`.** Every page would have to
  remember to call it.
- **A configurable hook or dialog for creating from the route and from the selector**, a `ui/forms/`
  folder with a shared `useQuickCreate`, or every entity's form in `components/` from day one. They
  mix route and callbacks, or create structure before the second entry.

## UI and interaction

### Decision

- **Base UI is the primitives layer**, with the components as our own code added by the shadcn CLI.
  Toast and Combobox come from Base UI, without `sonner` or `cmdk`.
- **Three-state theme** (`light`, `dark`, `system`), stored as a choice and resolved on the fly, in a
  store of our own. The resolved theme goes to `identity-service` at login.
- **Filter bars are React Hook Form forms** with the shared fields, never hand-assembled primitive
  parts. A Buscar button applies every filter; typing does not search.
- **Deleting is a dialog route over the list**, opened by a trash icon on the row. The edit page has
  no delete button.
- **Interaction only by click and the primitives' native keyboard.** There are no custom keyboard
  shortcuts.
- **Application and domain error messages are curated pt-BR text** and are shown as they come. Model
  binding messages may come in English from the framework ([API.md](../API.md), §4.3).

### Rejected

- **Staying on Radix.** It would be off the shadcn CLI's default path and keep `sonner` and `cmdk`.
- **Closed component libraries** (Mantine, HeroUI, Chakra): the primitives' code stops being ours.
- **`next-themes`**, for bringing SSR machinery to what our store does in about sixty lines, and
  **`light-dark()` in CSS**, because the manual selector still needs to control `color-scheme`.
- **Segmented buttons, tabs or a "Filtros" popover** to pick the status (active or inactive) in a
  list. It is a filter-bar field like the others.
- **A fixed-list `SearchSelect` with a remote variant on top.** The base ended up carrying the remote
  search's states.
- **Deleting from the edit page**, or from both places.
- **Custom keyboard shortcuts.** They were removed; bringing them back needs a new decision.
