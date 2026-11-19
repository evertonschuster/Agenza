---
name: agenza-ptbr-copy
description: Writes or revises admin-frontend pt-BR copy — buttons, failure, empty and loading states, confirmations, accessible labels and displayed dates, numbers and money (texto da tela, mensagem, rótulo, formato de data). Use for wording or display formatting. Not for component behavior (agenza-ui-primitive) or form errors (agenza-form-field).
---

# Product language

Write for the owner of a service business: name the action and the thing affected, in short sentences
and sentence case. Prefer “Serviço salvo.” to “Sua solicitação foi processada com sucesso.” Accessible
names are product copy too.

Use the vocabulary of the screen and the
[architecture guide](../../../apps/admin-frontend/docs/ARCHITECTURE.md): Pessoa, Responsável, Pessoa de
referência and Etiqueta are `Client`, `ClientGuardian`, `ClientReferenceContact` and `Tag` in code. Do
not rename navigation destinations as a copy cleanup.

| Action                      | Wording                                                               |
| --------------------------- | --------------------------------------------------------------------- |
| Commit form changes         | Salvar                                                                |
| Abandon editing             | Cancelar; Fechar when there is no edit, Voltar for navigation         |
| Destroy a record            | Excluir; Remover means disassociating something without destroying it |
| Start creation              | Novo/Nova followed by the domain noun                                 |
| Modify, search, end session | Editar, Buscar, Sair                                                  |

Keep the same verb in the button, the confirmation and the success message. Avoid vague errors,
implementation language and routine exclamation marks; use gender-neutral wording when the person's
gender is unknown. Numbers, money, durations and dates: [formatting.md](references/formatting.md).

## Failures

Name what did not happen and offer a recovery the screen actually supports, through the existing
problem component so its stable code stays visible for support. A retry instruction needs a working
retry action; “contacte o administrador” alone does not help, and support copy never asks for a
password. The [message policy](../../../docs/API.md#7-frontend-consumption-and-message-policy)
owns which API messages are shown; never add exception text, OIDC-provider descriptions, `detail`,
`type` or diagnostic ids as copy. Local schema messages are specific to the field; one field never
shows two competing messages, and expected validation never becomes a full-screen failure.

## Empty, loading and unavailable

| Situation                     | Copy and recovery                                                                                          |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Nothing has been created      | “Nenhum serviço ainda”, a brief explanation and the creation action                                        |
| Applied filters match nothing | Say nothing matched and offer Limpar busca/filtros                                                         |
| Data did not load             | Explain the failure and show recovery; never claim that no records exist                                   |
| Data is loading               | The existing skeleton and `aria-busy`; if text is needed, name the content, such as “Carregando serviços…” |

Decide from the applied filters and the loading state, never from an absent response. A destination
not built yet explains what it will do and gives a working way back, without a date or fake rows.

## Confirmation and success

Describe the record and the real consequence; check whether deletion is soft, recoverable or blocked
by related data before promising anything. The confirmation button repeats the verb, such as
Excluir, never “Sim” or “OK”. Follow the screen's existing success feedback without duplicate
notifications, short and specific: “Pessoa cadastrada”, “Etiqueta atualizada”.

Keep ordinary copy with its component and reusable code-to-message data in the slice's `model/`. Reuse
[shared/format](../../../apps/admin-frontend/src/shared/format/) and
[shared/values](../../../apps/admin-frontend/src/shared/values/); do not add an i18n catalog or a
formatting abstraction for a single wording edit.
