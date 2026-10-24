# ADR 0079 — admin-frontend: every page header comes from the routes, with a back arrow to the level above

Status: accepted (2026-10); amends point 1 of [ADR 0077](0077-admin-frontend-client-edit.md) (the edit page's title
now comes from its route) and the page headers of [ADR 0067](0067-admin-frontend-clients-list.md) and the Etiquetas
list

## Context

Each page built its own header. The Pessoas form passed `PageHeader` a hand-written trail
(`PAGE_PARENTS = [{ label: 'Pessoas', to: CLIENTS_PATH }]`) and chose its title between "Nova pessoa" and "Editar
pessoa"; the lists, Início and Serviços wrote a bare `<h1>` beside their action; the "Em breve" screens put the title
inside their centred card. The owner asked on 2026-10-22 for one reusable header that builds the trail and offers a
way back. Three forks were asked before coding; the answers are points 1, 2 and 3.

## Decision

1. **The trail comes from the routes.** Every page route in `app/routes.tsx` declares its label as
   `handle: crumb('Pessoas')` (a `PageCrumbHandle`, `{ crumb: string }`). `PageHeader` (`widgets/page-header`) reads
   `useMatches()` through `usePageCrumbs`, keeps the matches that have a crumb, shows the last one as the page's `h1`
   (`aria-current="page"`) and the ones before it as links to their own path. A page declares nothing about where it
   sits: `/pessoas/nova` reads "Pessoas › Nova pessoa" because `nova` is a child of `pessoas`. A child route with no
   crumb, such as the Etiquetas dialogs (`new`, `:id/edit`, `:id/delete`), leaves the trail of the page under it as it
   is. A page that renders `PageHeader` on a route with no crumb throws, rather than showing a page without a title.
2. **Every screen uses it**: Pessoas and Etiquetas (their action in `actions`), the Pessoas form (the situation badge
   in `titleAddon`, Desativar/Reativar in `actions`), Início and Serviços (their text in `description`) and the "Em
   breve" screens (the "Em breve" tag in `titleAddon`; the centred card keeps the icon, the text and "Voltar para o
   início"). The title is the same size everywhere (`text-lg`, `md:text-xl`), so the lists' `h1` is smaller than
   their former `text-2xl`.
3. **A back arrow goes to the level above**, not through the browser history: "Voltar para Pessoas" on
   `/pessoas/nova`, the same target when the page is opened from a link or a bookmark. **Início is the first level of
   every trail**: its crumb sits on the shell route (the pathless layout around every signed-in page, matched at `/`),
   not on the Home index route, so a list's arrow goes back to `/` ("Voltar para Início"); only Início itself has no
   arrow. The crumb is marked `hideInTrail`: it names the arrow's target and the Home page's own title, but is not
   shown as a link in the other trails, which read "Pessoas" and "Pessoas › Nova pessoa", since the name of the start
   page added nothing there. A first version put the crumb on the Home route and left the lists without an arrow; the
   owner asked the same day for the lists to go back home too, and then for "Início" to leave the trail. Under the `md` breakpoint the parents are hidden and only the arrow and the title stay; the arrow's accessible name
   says where it goes.
4. **Tests render pages on a data router.** `useMatches` only works under `createMemoryRouter`/`RouterProvider`, so
   page tests declare their routes with the crumbs they need, through `routerAt(routes, initialEntries)` or
   `renderRoutes(routes, initialEntry)` in `src/test/renderRoutes.tsx`, instead of `<MemoryRouter>`.

## Consequences

- `ClientFormPage` no longer needs `isEdit` from its hook; the title comes from `nova` or `:id/editar`.
- A label lives in `app/routes.tsx`, away from its page: renaming a screen means changing its crumb there. The tests
  repeat the crumbs they need, as they already repeated the paths.
- A dynamic label (a person's name in the trail) is not supported yet: a crumb is a fixed string. Build it when a
  page needs it, for instance with a crumb that a loader fills.

## Alternatives considered

- **Keep the trail in each page** (`parents` and `title` as props): explicit, but every page repeats the way to it.
  Turned down by the owner.
- **Only the child pages use the header**, the lists keeping their large `h1`: two header styles. Turned down.
- **A back arrow through the history** (`navigate(-1)`, falling back to the level above): it can lead out of the
  trail, and the lists keep their filters in their hook (ADR 0072), so going back through the history restores nothing
  more. Turned down, as was having no arrow.
