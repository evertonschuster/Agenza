---
description: 'Tarefas da mudança, ordenadas por dependências e validadas conforme o risco.'
---

# Tarefas: etiquetas no cadastro de pessoa com SearchSelect

**Entradas**: [spec.md](spec.md) e [plan.md](plan.md).

## US2 — SearchSelect reutilizável nos dois modos

- [x] T001 [US2] Tipos e carregamento em `src/shared/ui/search-select/search-select.types.ts` e
  `use-search-select-items.ts`: primeira página ao abrir, busca após 300 ms, "Carregar mais", cancelamento.
- [x] T002 [US2] Testar em `use-search-select-items.test.tsx` que uma busca nova cancela a anterior e a resposta
  cancelada não aparece, que a próxima página se acrescenta e que a falha permite nova tentativa.
- [x] T003 [US2] Componente em `src/shared/ui/search-select/index.tsx` e `components/`: pílulas, lista, estados,
  limite, modo de uma seleção com limpar.
- [x] T004 [US2] Testar em `search-select.test.tsx` marcar, desmarcar, remover pela pílula, limite, uma seleção,
  estados vazios e nomes acessíveis.
- [x] T005 [US2] `SearchSelectField` em `src/shared/form/fields/components/search-select-field.tsx`, tipos em
  `fields.types.ts` e exportação; testar valor e erro do formulário em `search-select-field.test.tsx`.

- [x] T013 [US2] Separar em duas camadas: `SearchSelect` sobre lista fixa em `src/shared/ui/search-select/`
  e `RemoteSearchSelect` com `use-remote-items.ts` em `src/shared/ui/remote-search-select/`;
  `SearchSelectField` e `RemoteSearchSelectField`; testes de cada camada.

## US1 — Marcar etiquetas numa pessoa

- [x] T006 [US1] Exportar `tagsRepository` e `NEW_TAG_PATH` em `src/features/tags/index.ts` e `ui/tagsPaths.ts`.
- [x] T007 [US1] Modelo `ClientTag`, `tags`, `tagIds` e `CLIENT_MAX_TAGS` em `src/features/clients/model/`;
  remover o paliativo em `api/clientsRepository.ts` e cobrir o corpo em `clientsRepository.test.ts`.
- [x] T008 [US1] Schema, valores iniciais e troca da chave `TagIds` em `ClientFormPage/clientForm.ts` e
  `useClientFormPage.ts`; campo em `components/ClientPersonSection.tsx`.
- [x] T009 [US1] Testar em `clientForm.test.ts` e `ClientFormPage.test.tsx` o envio de `tagIds`, as etiquetas na
  edição, o limite e `Tag.NotFound` sob o campo.
- [ ] T010 [US1] Estender `e2e/clients.spec.ts`: criar pessoa com etiqueta e vê-la na edição. Cenário escrito;
  falta executá-lo contra o stack real.

## Transversais

- [x] T011 ADR 0090 em `docs/adr/` e índice; atualizar `docs/ARCHITECTURE.md` se necessário.
- [ ] T012 Rodar lint, Prettier, build, cobertura e drift do OpenAPI; conferir no navegador.

## Dependências e validação final

T001 antecede T003; T003 antecede T005; T005 e T006 antecedem T008. T007 e T011 não dependem do componente.
Os gates de T012 encerram a mudança.
