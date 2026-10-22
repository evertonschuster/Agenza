# ADR 0077 — admin-frontend: editing a person on the registration form, with the situation change beside it

Status: accepted (2026-10); frontend of issue #156 (edit a person and their contacts) and of #157/#158 (deactivate
and reactivate); consumes the contracts of `PUT /api/v1/clients/{id}`, `GET /api/v1/clients/{id}` and
`POST /api/v1/clients/{id}/{deactivate,reactivate}` as they are; follows the form of
[ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) and the list of
[ADR 0067](0067-admin-frontend-clients-list.md) as amended by [ADR 0076](0076-admin-frontend-clients-list-filter-bar.md)

## Context

The Pessoas slice could register a person (`/pessoas/nova`) and list them (`/pessoas`). The backend already answers a
person by id, replaces a person and their contacts in one `PUT`, and moves a person between active and inactive. The
name in the list links to `/pessoas/:id`, which is still the "Em breve" Detalhes screen.

The owner asked for editing on the same form as registration, loaded from the backend the way Etiquetas loads a tag
into its form. Three forks were put to the owner on 2026-10-22 before writing code; the answers are points 1, 3 and 4.

## Decision

1. **Editing lives at `/pessoas/:id/editar` and is reached from a pencil in the list.** The list gains an **Ações**
   column with one icon link per row, named "Editar <nome>" for assistive tech (`editClientPath(id)` in
   `ui/clientsPaths.ts`). The name keeps pointing at `/pessoas/:id`, so Detalhes can arrive later without moving the
   edit route. The path is pt-BR like `/pessoas/nova`, not `:id/edit` as in Etiquetas, whose paths predate the pt-BR
   convention.
2. **One page, one hook, two modes.** `ClientFormPage` and `useClientFormPage` serve both routes: with no `:id` the
   form starts empty and saves through `clientsRepository.create`; with one it loads `clientsRepository.get(id)`,
   fills the form with `toClientFormFieldValues(client)` (birth date as `dd/mm/aaaa`, CPFs masked, a missing value
   as `''`) and saves through `clientsRepository.update(id, values)`, which sends `{ clientId: id, ...input }`. The
   schema, the sections and the backend error mapping (`applyApiProblem`) are the same in both modes; the title is
   **Nova pessoa** or **Editar pessoa**, and after a save the page goes back to `/pessoas` with "Pessoa cadastrada" or
   "Pessoa atualizada". The `PUT` replaces the contacts, so a guardian removed from the form is gone after the save,
   and the minor rule is checked again on what is left.
3. **While the person loads, the person section shows a skeleton and Salvar is disabled. If the load fails** (404,
   network, 500), the page shows `toast.serverError('Não foi possível abrir a pessoa', problem)` and replaces itself
   with `/pessoas`, as Etiquetas does with a tag. The load is a mount effect keyed on `:id` with its own
   `AbortController`; it is not a list, so [ADR 0073](0073-admin-frontend-paged-list-asks-only-when-told.md) does not
   apply to it.
4. **The situation changes from the edit page, in a confirmation dialog.** Next to the title the page shows the
   situation badge (the list's, now `ui/components/ClientStatusBadge.tsx`, shared by both pages of the slice) and a
   **Desativar pessoa** or **Reativar pessoa** button. The button opens `ConfirmDialog` with the matching copy and
   calls `deactivate(id)` or `reactivate(id)`; on success the badge and the button follow the answer, and whatever was
   typed in the form stays, unsaved. A refusal (e.g. a reactivation blocked because another person now uses the CPF or
   the e-mail) shows the backend's message in the dialog's blocked view. The button is disabled while the form saves,
   and a new person has neither the badge nor the button. Inactive people can be edited, as the backend allows.
5. **`ConfirmDialog` takes `confirmation.confirmVariant`** (`'destructive'`, the default, or `'default'`), because
   reactivating is not destructive and its button must not be red. Every existing caller keeps the red button.
6. **`GET`/`PUT` answer `status` as a plain string**, unlike the list item, which uses the `ClientStatus` enum. The
   slice reads it with `toClientStatus(value)` in `model/clientStatus.ts` instead of casting. Typing the response's
   `status` as the enum is a backend change, left for its own PR.

## Consequences

- `/pessoas/nova` behaves as before: the 33 registration tests of the page passed with only the repository mock
  extended.
- Returning to `/pessoas` after a save opens the list on its opening filters (Ativas, page 1), since the list keeps its
  state in its hook ([ADR 0072](0072-admin-frontend-paged-list-state-in-the-hook.md)), as after a registration.
- The e2e that opens Detalhes from the name now matches the name exactly, since "Editar <nome>" also contains it.

## Alternatives considered

- **The name opens the edit form until Detalhes exists**, or **`/pessoas/:id` becomes the edit form**: less UI today,
  but the name's target or Detalhes' address would change later. Turned down by the owner.
- **An error state with "Tentar novamente" on a failed load**: a pattern Etiquetas does not have. Turned down.
- **Leaving the situation for another delivery, or blocking edits of inactive people**: the owner chose to ship the
  change of situation with editing; blocking inactive people would be a rule the backend does not have.
- **A nested route for the dialog** (`/pessoas/:id/editar/desativar`, like `/tags/:id/delete`): it would need an
  `Outlet` in the form page and a topic to tell the page the new situation. The dialog's open state in the page hook
  is enough.
