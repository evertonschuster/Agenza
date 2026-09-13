---
name: agenza-ptbr-copy
description: Use when writing or reviewing any user-visible string in the admin frontend — labels, buttons, headings, dialog and toast text, empty states, error messages, "Em breve" screens, accessible names — or when formatting a date, time, duration, price, percentage or count for display. Trigger on new pt-BR copy, on branching over an ApiProblem code, and on any Intl / toLocaleString call.
---

# pt-BR copy and formatting

The reader is the owner-operator of a small service business — a salon, a clinic, a studio. One
person, one business ([AGENTS.md](../../../AGENTS.md) → "O produto"). She is not an IT manager and
did not ask for a system; she asked for her day to run. Write to her.

Two rules decide most questions:

- **Visible text is pt-BR; code identifiers are English.** Key names — `Ctrl`, `Esc`, `Enter`,
  `Shift`, `Tab`, `⌘` — are **not** translated: that is what is printed on the ABNT2 keyboard in
  front of her. Everything around them is pt-BR — "Pressione Esc para fechar", never "Pressione
  Escape".
- **Never surface a raw backend message.** Branch on the stable `code`, write the pt-BR yourself.
  → [`references/states.md`](references/states.md)

Formatting depth (money, duration, dates, plurals, the timezone trap) →
[`references/formatting.md`](references/formatting.md).
Failure, empty, loading and "Em breve" copy → [`references/states.md`](references/states.md).
Error taxonomy and per-field form errors are `agenza-api-contract`'s job, not this skill's.

## Voice

| Do | Not | Why |
| --- | --- | --- |
| "Serviço salvo." | "Sua solicitação foi processada com sucesso." | Say the thing that happened, in her nouns. |
| "Excluir serviço" | "Realizar exclusão do registro" | Active voice, real verb. The control says exactly what happens. |
| "você" | "o usuário", "o cliente do sistema" | Second person. She is not a row in a table. |
| "Não foi possível salvar o serviço." | "Ops! Algo deu errado 😕" | No apology, no mascot, no vagueness. |
| "Olá, {nome}" | "Bem-vindo, {nome}" | Gendered greetings are wrong half the time. Hardcoding "Bem-vinda" is equally wrong. |
| "Nenhum serviço ainda" | "Sem resultados" | "ainda" says the emptiness is temporary and hers to fill. |

**Name things the way the owner recognises them, not the way the system is built.** She has
*etiquetas*, not `tags`; the code identifier stays `tag`. She has an *Agenda*, not "Agendamentos".
The six destination labels are fixed by
[spec FR-005](../../../apps/admin-frontend/specs/002-ui-foundation/spec.md) — don't invent synonyms
for them screen by screen.

**Sentence case, always** — "Novo serviço", not "Novo Serviço". Portuguese capitalises proper nouns
and the first word, nothing else. Title Case in a pt-BR button is the single loudest tell that a
string was translated from an English mockup. No ALL CAPS labels either.

**A control and its confirmation are the same verb.** Button "Excluir serviço" → dialog "Excluir
este serviço?" → confirm "Excluir" → toast "Serviço excluído." If the toast says "removido", the
person cannot tell whether the same thing happened.

**One exclamation mark per screen at most**, and only for something genuinely worth celebrating.
Never on an error.

## Recurring vocabulary

Consistency beats cleverness: the same action must read identically on every screen, in the command
palette, and in the shortcut help sheet.

| Use | Never | Note |
| --- | --- | --- |
| **Salvar** | Enviar, Confirmar, OK, Aplicar | The commit verb for a form. |
| **Cancelar** | Voltar, Descartar | Abandons an edit in progress. Use **Fechar** when nothing changed, **Voltar** when it is navigation. |
| **Excluir** | Deletar, Apagar | Destroys the record. **Remover** is for taking something out of a list without destroying it — an etiqueta off a serviço. |
| **Novo serviço** | Adicionar, Criar, "+" alone | Name the thing. The same string works as a button, a palette entry and an accessible name. |
| **Editar** | Alterar, Modificar | — |
| **Buscar** | Pesquisar, Procurar | Reserve **Filtrar** for actual filters. |
| **Sair** | Logout, Encerrar sessão, Desconectar | — |
| **Voltar** | Retornar, a bare "←" | An arrow with no accessible name fails review. |
| **Em breve** | Em construção, Em desenvolvimento, Coming soon | And never as the whole message — see states. |
| **Nenhum(a) … ainda** | Sem resultados, Lista vazia, Nada por aqui | The never-created empty state. |
| **Não foi possível …** | Erro ao …, Falha ao …, Ops! | Names the action that failed, then the next step. |

## Where strings and formatters live

**There is no message catalog and no `t()`.** Internationalisation beyond pt-BR is explicitly out of
scope for the UI foundation, so a string sits in the component that renders it. Do not introduce an
i18n layer to "prepare" for a language nobody asked for.

The one exception: a **code → message map is data, not markup**. It belongs in the slice's `model/`,
where it is pure and testable without React, next to the branch that consumes it.

**Formatters live in `src/shared/format/`** — cross-cutting, no business rule, so `shared/` by the
dependency direction in [`docs/ARCHITECTURE.md` §1](../../../apps/admin-frontend/docs/ARCHITECTURE.md).
The folder does not exist yet; create it with the first screen that needs it, not before. Note that
the coverage exclusion covers `src/shared/ui/**` only — `shared/format/**` is measured, and these are
exactly the pure functions that make the gate easy.

## What breaks

- **`index.html` still declares `<html lang="en">`** while every string in the app is pt-BR. A screen
  reader pronounces "Serviços" with English phonemes. Fix it in the same PR as the first real screen.
- **A pt-BR currency string never contains a plain space.** `Intl` puts a non-breaking space between
  `R$` and the digits, and *which* non-breaking space has changed between ICU versions. A test
  asserting `'R$ 129,90'` typed with U+0020 fails, and looks like a formatting bug when it is an
  assertion bug. → [`references/formatting.md`](references/formatting.md)
- **A date-only value shifts a day.** `new Date('2026-09-04')` is UTC midnight, which is 3 September
  in São Paulo. → [`references/formatting.md`](references/formatting.md)
- **Shortcut matching reads `event.key`, never `event.code`.** On ABNT2 the physical key positions do
  not match a US layout, so `code`-based matching binds the wrong key.
- **Rendering a load failure as an empty state** tells the owner she has no clients when in fact the
  network is down. → [`references/states.md`](references/states.md)
- **`aria-label` must not carry the keyboard shortcut.** The shortcut goes in `aria-keyshortcuts` and
  a `<kbd aria-hidden>`; a screen reader reading "Novo serviço, tecla N" as the name is noise. The
  accessible name must equal the visible label.
