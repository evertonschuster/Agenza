# Failure, empty, loading and "Em breve"

Read [`SKILL.md`](../SKILL.md) first. The error *taxonomy* — which `code` a backend produces, the
`ApiProblem` shape, the three synthetic problems, how `errors` maps onto a form — belongs to
`agenza-api-contract` and its
[`references/errors.md`](../../agenza-api-contract/references/errors.md). This file is only the
prose that reaches the owner.

## The failure standard

[ADR 0020](../../../../docs/adr/0020-actionable-authentication-feedback.md) set it for authentication;
it holds everywhere. A failure message is three things, and it is incomplete without all three:

1. **A stable code** she can quote — the `code` on the problem, in English, never re-worded.
2. **A curated pt-BR explanation** of what did not happen, written by us for this screen.
3. **A recovery action** — as a control if one exists, as an instruction if not.

ADR 0020 says it plainly: a generic *"contacte o administrador"* is **not sufficient**. Neither is
"Tente novamente" with nothing to try again with. When the only path really is support, say what to
include (the code and the time of the attempt) — and, on any credential-adjacent screen, that she
must never share a password.

**Never render** the provider's or the server's own words: `detail`, `type`, an exception message, an
OIDC adapter description. `traceId` / `correlationId` go to `shared/logger.ts` and a support surface,
never into body copy.

`title` is the one grey area. It *is* pt-BR prose written for a user, so it is an acceptable
**fallback** for a code your screen did not enumerate — that is what `AppRouteError` does. It is not
stable and it does not know what screen it is on, so for every code your screen actually branches on,
write the string yourself.

The three synthetic problems already carry curated titles in `src/shared/api/servicesFacade.ts` —
note the shape: what happened, then what to do, in one line. Match it.

## Where a failure renders

| Shape | Use when | Example |
| --- | --- | --- |
| Full screen | The session or the whole route is unusable | `FullScreenMessage` — session expired, route loader rejected |
| Inline, in the region | One region failed and the rest of the screen is intact | A list that could not load, with **Tentar novamente** above the empty space |
| Field error | A 400 with `errors` — expected flow, not an error screen | The message sits with the field, tied by `aria-describedby` |
| Toast | A mutation failed and the screen is still hers | "Não foi possível excluir o serviço." |

The middle two are the ones that get skipped. Routing a validation error to a full-screen error is
the exact mistake [`docs/ARCHITECTURE.md` §2](../../../../apps/admin-frontend/docs/ARCHITECTURE.md)
warns about: "nome já utilizado" is expected flow.

For fields, prefer your own copy for anything you can check locally — a required field, a length, a
format — because your form knows the label and the server does not. Fall back to the server's message
for what only the server can know, like uniqueness. Never show both for one field.

## Empty is not one state

Three different situations, three different messages. Collapsing them is the most common copy bug in
an admin panel.

| Situation | Message | Action |
| --- | --- | --- |
| Never created | "Nenhum serviço ainda" + one line on what a serviço is for here | The primary action: **Novo serviço** |
| Filter or search matched nothing | "Nenhum serviço encontrado para «corte»" | **Limpar busca** — never the create button, she is looking, not creating |
| Load failed | **Not an empty state.** A failure. | See above |

**Rendering a load failure as an empty state tells the owner she has no clients when the network is
down.** She will believe it. Any list that can fail must distinguish "loaded, and there are none"
from "did not load" before it renders a word.

The first cell explains the emptiness, *then* offers the action — in that order. An empty state that
is only a button teaches nothing.

## Loading

Prefer no text at all. A skeleton shaped like the content that is coming beats "Carregando…" and
survives a slow connection without a layout jump. If a word is unavoidable, name the noun —
"Carregando serviços…" — never "Aguarde", never "Processando sua solicitação".

A region that is loading is `aria-busy`; a route change is announced by the shell's route announcer.
Do not add a second live region per screen — see `agenza-a11y-review`.

## "Em breve"

[FR-006](../../../../apps/admin-frontend/specs/002-ui-foundation/spec.md) is explicit: a destination
without a backend renders an explanation **specific to that destination** and must not be presented
as functional. The acceptance test is literally that four screens do not repeat one generic sentence.

Each one says, in the owner's terms: what this part of the panel will do for her, and a way back to
something that works. It does not say "em desenvolvimento", does not show a percentage, does not
promise a date, and does not render disabled buttons or fake rows — a greyed-out control invites a
click and teaches that the panel is broken rather than unfinished.

The navigation marks these destinations as unavailable *before* the click (FR-006, acceptance
scenario 2), so "Em breve" confirms an expectation rather than springing a surprise.

## Confirmation and success

A destructive dialog names what is lost and whether it comes back:

> **Excluir este serviço?**
> "Corte feminino" sai do catálogo e não poderá ser recuperado. Os agendamentos já marcados não são
> alterados.
> [Cancelar] [Excluir]

The confirm button repeats the verb — **Excluir**, never "OK", never "Sim". A dialog whose buttons
are Sim/Não forces her to re-read the question to know what Sim does.

Success is short, past, and silent where possible: "Serviço salvo." If the change is already visible
on screen, a toast is noise — skip it. No exclamation mark on a routine save.

## Before you ship a screen

- Every failure path has a code, an explanation and a next step.
- No `detail`, no exception text, no provider prose reaches the DOM.
- Empty-because-none and empty-because-failed are different renders.
- The button verb, the dialog title verb and the toast verb are the same word.
- Sentence case everywhere; keys (`Ctrl`, `Esc`, `Enter`) untranslated.
- The accessible name equals the visible label, and the shortcut is not inside it.
