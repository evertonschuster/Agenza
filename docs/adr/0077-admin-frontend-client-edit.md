# ADR 0077 — admin-frontend: editing a person on the registration form, with the situation change beside it

Status: accepted (2026-10); frontend of issue #156 (edit a person and their contacts) and of #157/#158 (deactivate
and reactivate); consumes the contracts of `PUT /api/v1/clients/{id}`, `GET /api/v1/clients/{id}` and
`POST /api/v1/clients/{id}/{deactivate,reactivate}` as they are; follows the form of
[ADR 0044](0044-clients-aggregate-uniqueness-and-conflict-contract.md) and the list of
[ADR 0067](0067-admin-frontend-clients-list.md) as amended by [ADR 0076](0076-admin-frontend-clients-list-filter-bar.md)

## Context

The Pessoas slice could register a person (`/pessoas/nova`) and list them (`/pessoas`). The backend already answers a
person by id, replaces a person and their contacts in one `PUT`, and moves a person between active and inactive. The
name in the list linked to `/pessoas/:id`, which is still the "Em breve" Detalhes screen.

The owner asked for editing on the same form as registration, loaded from the backend the way Etiquetas loads a tag
into its form. Three forks were put to the owner on 2026-10-22 before writing code; the answers are points 1, 3 and 4.

## Decision

1. **Editing lives at `/pessoas/:id/editar` and is reached from the name and from a pencil in the list.** Both links
   use `editClientPath(id)` in `ui/clientsPaths.ts`; the list gains an **Ações** column with one icon link per row,
   named "Editar <nome>" for assistive tech. The path is pt-BR like `/pessoas/nova`, not `:id/edit` as in Etiquetas,
   whose paths predate the pt-BR convention. A first version kept the name on `/pessoas/:id`, the "Em breve" Detalhes
   screen; the owner asked on the same day, after trying it, for the name to open the edit page. The `/pessoas/:id`
   route and its placeholder stay, with no link to them, until Detalhes is built; `clientDetailPath` went away with
   its last caller.
2. **One page, one hook, two modes.** `ClientFormPage` and `useClientFormPage` serve both routes: with no `:id` the
   form starts empty and saves through `clientsRepository.create`; with one it loads `clientsRepository.get(id)`,
   fills the form with `toClientFormFieldValues(client)` (birth date and CPFs as they come, a missing value
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
6. **`Client.status` is a `ClientStatus`**, read as the backend sends it. A first version found `status` typed as a
   plain string in `GET`/`PUT` and narrowed it with a `toClientStatus` helper; PR #189 typed the response's `status`
   as the `ClientStatus` enum, as the list item already was, and the helper went away.
7. **A date is a `Date` in the form too.** A first version filled the birth date with
   `formatMaskedDate(new Date(client.birthDate))`, because `DateField` kept the masked text `dd/mm/aaaa` in the form
   and the schema turned it into a `Date` only on submit. The owner asked for the form to hold the `Date` itself:
   `DateField` keeps the typed text as its own state and gives the form a `Date` once the text is a whole, real day,
   or `null` otherwise; the API client hands the backend's `yyyy-MM-dd` over as a `Date` (point 8), so
   `Client.birthDate` is a `Date | null` and the form takes it as it comes. Every date stays midnight UTC, as before. At the owner's
   choice the field does not tell the form that the text is half typed: an incomplete or impossible date is saved as
   no birth date, and the message "Informe uma data válida no formato dd/mm/aaaa." went away.
   The `dd/mm/aaaa` mask, parse and format, now used only by `DateField`, moved beside it
   (`shared/form/fields/components/masked-date.ts`).
   The CPF followed the same rule: a first version filled it with `maskCpf(client.cpf)`, because `MaskedField` kept the
   masked text in the form. `MaskedField` now takes `mask` (the stored value to the text shown) and `unmask` (the
   typed text to the stored value), so `CpfField` keeps the 11 digits in the form and shows `529.982.247-25`; the
   form takes the CPF as it comes. Unlike the date it needs no state of its own, as half a CPF is still digits.
8. **A date in a response arrives as `Date`.** A first version of point 7 converted the birth date in
   `clientsRepository` with `parseIsoDate`; the owner asked for the deserialization to do it. JSON has no date type and
   openapi-fetch has no hook to parse a body differently, so `scripts/generateApiTypes.mjs` now types `format: date` as
   `Date` in responses as well as request bodies, and writes the names of those properties to
   `src/shared/api/generated/dateFields.ts`; the facade's `run()` passes every successful payload through `reviveDates`
   (`shared/api/apiClient.ts`), which turns a listed property holding `yyyy-MM-dd` into
   `utcDate` midnight. Converting every `yyyy-MM-dd` string, whatever its field, was turned down: a free-text note
   reading `2020-01-01` would become a `Date`. Generating a transformer per response with `@hey-api/openapi-ts`, or a
   Zod schema per response, was turned down as a new generator and client, or a schema per endpoint, for one field.
   The names cover a list of dates and a date inside an inline object or a list item, and `reviveDates` carries a
   list's name to its items. Since the conversion goes by name, the generator fails when a date property's name is used
   for something else in another schema, or when a date sits in a dictionary, which has no name to match. A schema a query parameter reaches keeps its dates as `string`, as a query string cannot carry a
   `Date`. The repository forwards results as they come again.

## Consequences

- `/pessoas/nova` behaves as before: the 33 registration tests of the page passed with only the repository mock
  extended.
- Returning to `/pessoas` after a save opens the list on its opening filters (Ativas, page 1), since the list keeps its
  state in its hook ([ADR 0072](0072-admin-frontend-paged-list-state-in-the-hook.md)), as after a registration.
- The e2e that opened Detalhes from the name now opens the edit page from it, matching the name exactly, since
  "Editar <nome>" also contains it.
- When Detalhes is built, the name's target is decided again; the edit route does not move.

## Alternatives considered

- **The name keeps pointing at Detalhes**: the first version. Turned down by the owner, since the name led to a
  screen that does nothing yet.
- **`/pessoas/:id` becomes the edit form**: no new route, but Detalhes would lose its address. Turned down by the
  owner.
- **An error state with "Tentar novamente" on a failed load**: a pattern Etiquetas does not have. Turned down.
- **Leaving the situation for another delivery, or blocking edits of inactive people**: the owner chose to ship the
  change of situation with editing; blocking inactive people would be a rule the backend does not have.
- **A nested route for the dialog** (`/pessoas/:id/editar/desativar`, like `/tags/:id/delete`): it would need an
  `Outlet` in the form page and a topic to tell the page the new situation. The dialog's open state in the page hook
  is enough.
