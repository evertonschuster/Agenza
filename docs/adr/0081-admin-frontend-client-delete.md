# ADR 0081 — admin-frontend: deleting a person works like deleting a tag

Status: accepted (2026-10); the frontend half of #159, over the endpoint of
[ADR 0080](0080-clients-delete.md); retires the `useCloseRoute` row of ARCHITECTURE §6

## Context

The backend answers `DELETE /api/v1/clients/{id}` since #197: `204`, `404 Client.NotFound` for an unknown, foreign or
already deleted id, `409 Client.HasAppointments` when any appointment exists and `409 Client.SaveFailed`. #159 asks for
an **Excluir** action "nos detalhes" with an explicit confirmation, the person gone from the list afterwards and the
blocking reason shown in Portuguese. Detalhes (`/pessoas/:id`) is still the "Em breve" screen, and the edit page stands
in for it ([ADR 0077](0077-admin-frontend-client-edit.md)).

A first refinement put the action beside **Desativar pessoa** on the edit page, opened by state in the page hook. The
owner turned it down on 2026-10-25: deleting a person must work like deleting a tag.

## Decision

1. **A trash can in the list.** The **Ações** column gets `ClientDeleteLink` beside the pencil, an `ActionLink` named
   "Excluir {nome}" to `/pessoas/:id/excluir`, written once as `deleteClientPath(id)` in `clientsPaths.ts`. The edit
   page has no delete button, as the tag form has none. When Detalhes is built, where the action also lives is decided
   again.
2. **The route opens over the list.** Under `pessoas`, a pathless layout route renders `ClientListPage`, whose children
   are the `index` and `:id/excluir`; the list gains an `<Outlet />`. The child has no crumb, like the Etiquetas
   dialogs, so the header still reads "Pessoas" ([ADR 0079](0079-admin-frontend-page-header-from-routes.md)).
   `nova`, `:id/editar` and `:id` stay whole pages beside it.
3. **`ClientDeletePage` and `useClientDeletePage` are `TagDeletePage` and `useTagDeletePage` for a person.** The hook
   loads `clientsRepository.get(id, signal)` on mount with its own `AbortController`; the `ConfirmDialog` is `loading`
   until it answers. A failure to open warns with `toast.serverError('Não foi possível abrir a pessoa', problem)` and
   closes, which also covers a person deleted in another tab.
4. **A topic tells the list.** `model/clientEvents.ts` holds `clientDeleted`; `application/clientUseCases.ts` holds
   `deleteClient(id)`, which calls `clientsRepository.delete(id)` and publishes only on success. `useClientListPage`
   subscribes it to `usePaginatedList`'s `refetch`: the list stays mounted under the dialog, asks again for the page on
   screen with the filters it holds, keeps its rows until the answer and moves to the last page when the total shrinks
   under it ([ADR 0073](0073-admin-frontend-paged-list-asks-only-when-told.md),
   [ADR 0074](0074-admin-frontend-tags-list-asks-only-when-told.md)). Create, edit, deactivate and reactivate publish
   nothing: they are whole pages, and the list mounts again behind them.
5. **The copy follows the tag dialog.** "Excluir pessoa?"; "Tem certeza que deseja excluir {nome}?" and "Essa ação não
   pode ser desfeita." on separate lines; the success toast "Pessoa excluída" / "O cadastro de {nome} foi excluído.".
   A refusal shows `ConfirmDialog`'s "Não é possível excluir" with the backend's message as it comes, which for
   `Client.HasAppointments` already suggests deactivating; the dialog offers no Desativar button of its own.
6. **`clientsRepository.delete(id)`** returns `ApiResult<void>` over `servicesApi.del`, under the same `delete` key as
   `tagsRepository`.
7. **`useCloseRoute(fallbackPath)` moves to `shared/hooks/`.** ARCHITECTURE §6 deferred it until a third route opened
   as a dialog needed the same close, and this is the third. It goes back through the history when the route was
   reached by navigation, which restores the list's address with its filters, and otherwise replaces the address with
   the fallback. `useTagFormPage`, `useTagDeletePage` and `useClientDeletePage` use it, and so does the edit page's
   `backToList`, which was the same seven lines. The effect that loads the record stays in each hook, since its
   success branch is the page's own. It is the second exception, after `usePaginatedList`, to "hooks are never shared
   between pages", and like it has no domain.

## Consequences

- `features/clients` gains an `application/` folder, as `features/tags` has, for the one use case that publishes.
- The link to `/pessoas/:id/excluir` leaves the list's query out, as the Etiquetas links do; the list keeps its filters
  in its own state while the dialog is open, and closing goes back to the address that carried them.
- `409 Client.HasAppointments` cannot happen before #153 creates appointments ([ADR 0080](0080-clients-delete.md)); the
  page test drives it through the repository mock and the e2e cannot reach it.

## Alternatives considered

- **Excluir pessoa on the edit page, beside Desativar/Reativar**, with the dialog opened by state in the page hook and a
  return to the list after success: the first refinement, closer to the issue's "nos detalhes". Turned down by the
  owner in favour of the Etiquetas shape.
- **Both the trash can and a button on the edit page**: two ways to the same dialog, and the tag form has none.
- **A Desativar shortcut inside the blocked dialog**: more than the feedback the refusal needs; the backend's message
  already names the way out.
- **`clientDeleted` published by the page hook** instead of a use case: Etiquetas publishes from
  `application/tagUseCases.ts`, and the owner asked for the same shape.
