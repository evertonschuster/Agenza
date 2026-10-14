# ADR 0067 — admin-frontend: the Pessoas list

Status: accepted (2026-10); consumes the contract of [ADR 0063](0063-clients-list-and-search-contract.md), follows
[ADR 0033](0033-admin-frontend-no-request-cancellation-layer.md) and
[ADR 0035](0035-admin-frontend-no-server-state-library.md)

## Context

#155 asks for the **Pessoas** screen: a list with a search box, a situation filter, paging, empty/loading/error states
and a situation indicator. Its backend half shipped first (ADR 0063, #176), as agreed for full-stack features. Four
points of the issue text disagree with that contract or with the state of the app, and the owner decided each on
2026-10-13, before any code:

- the issue says "Mascarar CPF na lista", and #139 says "CPF não aparece integralmente em listagens", but ADR 0063
  records the owner's decision that the CPF comes whole from the API;
- the issue names the search parameter `q`; the contract calls it `search`;
- the detail screen the names must lead to (#167) does not exist in the frontend yet;
- `shared/ui` has no select and no pagination control, and the owner wants to define those controls separately.

## Decision

1. **The CPF is shown whole and formatted** (`529.982.247-25`), with `maskCpf` from `shared/values/cpf`. Despite its
   name (the typing-time mask of the form field) it hides nothing. This follows ADR 0063 and overrides the text of #155
   and the criterion of #139.
2. **The screen reads `?q=` from the URL, as the tags list does, and sends `Search`** to the API. The repository takes
   only the search term; the backend defaults (`status=active`, `page=1`, `pageSize=20`) apply.
3. **The situation filter and the paging controls are not part of this change.** They arrive with the controls the owner
   will define. Until then the screen lists the first page (20 people) and nothing on it says there are more. A status line,
   "Exibindo 20 de 87 pessoas", was built and then removed by the owner. `status` and `page` enter the repository,
   the URL and the hook together with their controls, not before.
4. **Columns:** Nome, Telefone, E-mail, CPF, Situação. A missing phone, e-mail or CPF goes through `shared/ui/optional-text` (a dash, with "Não
   informado" for assistive tech). The situation is a `Badge` ("Ativa", "Inativa"); labels live in `model/clientStatus.ts`. Ativa is
   green (new `success` variant, from the `--success` token) and Inativa neutral gray (new `muted` variant): inactive
   is a normal, reversible state, so it must not read as an error, and the label carries the meaning, not the color
   alone. The two variants are tuned per theme for text contrast of at least 4.5:1 (the green text is mixed with
   `--foreground`, which darkens it on light and lightens it on dark); the light theme has a border and a stronger tint
   so the chips do not vanish on the white card.
5. **Each name links to `/pessoas/:id`**, which renders a provisional "Em breve" page (`app/pages/ClientDetails.tsx`)
   until #167 replaces it. The link already points at its final URL.
6. **Two empty states and a failure, as the copy rules ask**: nobody active yet ("Nenhuma pessoa ativa ainda", no button,
   the header already has **Nova pessoa**) and a search that found nobody ("Nenhuma pessoa encontrada para «ana»" with
   **Limpar busca**). `list-section` renders both itself, from `search` (`{ term, onClear }`) and `emptyCopy`
   (phrases the page writes, all optional, with generic defaults), so every list shares the logic and supplies only
   the words. The error state works the same way: the page passes `errorTitle` and a `failure` (the problem's message,
   its code and an `onRetry`), and the widget shows them with **Tentar novamente** (ARCHITECTURE §2 and §5).
   `TagListPage` was moved onto the same props right after.
7. **The repository forwards the whole page, like `create`.** `list` returns the facade's result verbatim:
   `{ items, totalCount, page, pageSize }`, with no mapper. The model declares the three paging fields as
   `number | string`, the wire's own type (the generator emits `int32` that way), because declaring them `number` would
   not compile without a mapper. Nothing reads them yet; the paging controls will convert with `Number()` in one place,
   the page hook.
8. **Nothing is extracted yet.** The search form and the URL/abort-controller logic of `useClientListPage` are the
   second copy of `TagListPage`'s. They are extracted into a `widgets/search-form` (and a shared pattern for the hook)
   when a third list needs them, the rule ARCHITECTURE §6 already states for `repeatable-list`.

## Consequences

- Acceptance criteria of #155 **not met by this change**: "cadastro inativo aparece quando o filtro o inclui", "alterar
  busca/filtro reinicia na página 1" for the filter, and "navegação entre páginas não repete nem omite registros". The
  inactive badge is built and tested, but no screen can show an inactive person until the filter exists, and a person
  past the 20th one is reachable only through the search, with no sign on screen that there are more.
- Criteria met: list, search by name, e-mail or CPF with or without the mask, the loading,
  empty and failure states, the situation indicator, the CPF, and navigation to the detail URL.
- The issues #155 and #139 still say "mascarar" and `q`; their text needs the same update ADR 0063 already asks for.
  This change does not edit the issues.
- A search over 254 characters never reaches the API: the field has `maxLength` 254, the backend's limit.
- Whole CPFs for up to 20 people are on screen, a volume that ADR 0063 accepted for the API and the screen inherits.

## Considered and rejected

- **Masking in the browser** (`***.982.247-**`). It meets the issue text, but the whole CPF stays in the response and
  the network tab, so the mask would only be cosmetic, and it contradicts the owner's decision recorded in ADR 0063.
- **No CPF column.** Receptionists could not tell people with the same name apart.
- **A native `<select>` and Anterior/Próxima buttons now.** It would deliver the filter and the paging, but it is a
  design chosen without the owner, and the first control of its kind becomes the pattern for the next lists.
- **A link to `/pessoas/:id` with no route**, which falls into the catch-all and returns to Início; or **plain text
  with no link**, which skips the navigation the issue asks for.
- **Fixing a page size selector or numbered pages.** Not asked for.
