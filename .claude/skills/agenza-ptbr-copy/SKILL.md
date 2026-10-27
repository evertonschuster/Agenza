---
name: agenza-ptbr-copy
description: Write or revise admin-frontend pt-BR interface copy, failure and empty states, accessible labels, and displayed numbers or dates.
---

# Product language

Write for the owner operating a service business: name the action and the thing affected, using
short sentences and sentence case. Prefer “Serviço salvo.” to “Sua solicitação foi processada com
sucesso.” Keep code identifiers in English and user-facing text in pt-BR, including accessible names.
Preserve key names such as `Ctrl`, `Esc` and `Enter`.

Use the vocabulary already present in the relevant screen and
[architecture guide](../../../apps/admin-frontend/docs/ARCHITECTURE.md): Pessoa, Responsável,
Pessoa de referência and Etiqueta correspond to `Client`, `ClientGuardian`,
`ClientReferenceContact` and `Tag` in code. Do not rename navigation destinations as a copy cleanup.

| Action                      | Wording                                                               |
| --------------------------- | --------------------------------------------------------------------- |
| Commit form changes         | Salvar                                                                |
| Abandon editing             | Cancelar; Fechar when there is no edit, Voltar for navigation         |
| Destroy a record            | Excluir; Remover means disassociating something without destroying it |
| Start creation              | Novo/Nova followed by the domain noun                                 |
| Modify, search, end session | Editar, Buscar, Sair                                                  |

Keep the same action verb in the button, confirmation and success message. Avoid vague errors,
technical implementation language and routine exclamation marks. Use gender-neutral wording when
the person's gender is unknown.

An icon-only control needs an accessible name. When text is visible, the accessible name must
include that label and describe the same action; decorative icons stay hidden from assistive
technology. Preserve the page's document language when changing HTML or layout.

## Choose the relevant detail

- Failure, empty, loading, confirmation or unavailable-screen copy:
  [states.md](references/states.md).
- Numbers, money, durations, dates or locale-sensitive assertions:
  [formatting.md](references/formatting.md).

Display API messages intended for users through the existing normalized problem/form surfaces;
branch on stable codes and typed metadata, never on free text. Do not surface exception messages,
provider descriptions or diagnostic payloads. The exact boundary is described with the live code in
[states.md](references/states.md).

Keep ordinary copy with its rendering component and reusable code-to-message data in the owning
slice's `model/`. Reuse [shared/format](../../../apps/admin-frontend/src/shared/format/) for display
helpers and [shared/values](../../../apps/admin-frontend/src/shared/values/) for domain parsing and
validation. Do not introduce an i18n catalog or new formatting abstraction for a single wording edit.
