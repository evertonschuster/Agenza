---
description: 'Tarefas da mudança, ordenadas por dependências e validadas conforme o risco.'
---

# Tarefas: etiquetas no cadastro de pessoa com RemoteSelect

**Entradas**: [spec.md](spec.md) e [plan.md](plan.md).

A versão em duas camadas (T001–T005, T013–T016) foi substituída pelo redesenho de 2026-11-06; o histórico
está no Git e na ADR 0090.

## US2 — RemoteSelect reutilizável

- [x] T017 [US2] Remover `src/shared/ui/search-select/`, `src/shared/ui/remote-search-select/`,
  `SearchSelectField`, `RemoteSearchSelectField`, seus tipos em `fields.types.ts`, exportações e testes.
- [x] T018 [US2] Primitivos em `src/shared/ui/combobox/`: conteúdo com âncora, chips, chip com cor e remover
  nomeado, input dos chips, trigger e indicador da opção, a partir do registry `base-nova`.
- [x] T019 [US2] `use-remote-options.ts` em `src/shared/ui/remote-select/` e testes com timers falsos:
  abrir, busca após 300 ms com o último texto, abrir com busca esperando, corrida de respostas, próxima
  página sem repetir item, travas do `loadMore`, `retry` da primeira e da próxima página, fechar e desmontar.
- [x] T020 [US2] `RemoteSelect` em `index.tsx` e testes: lista ao abrir, chips e remoção, limite, limpar,
  carregando, falha com nova tentativa, sem itens, sem resultado, rolagem, lista curta, rodapé e o Enter
  dentro de um `<form>`.
- [x] T021 [US2] `RemoteSelectField` em `src/shared/form/fields/`, tipos e exportação; testar nome, dica,
  valor no formulário e erro com foco.

## US1 — Marcar etiquetas numa pessoa

- [x] T006 [US1] Exportar `tagsRepository` em `src/features/tags/index.ts`.
- [x] T007 [US1] Modelo `ClientTag`, `tags`, `tagIds` e `CLIENT_MAX_TAGS` em `src/features/clients/model/`;
  remover o paliativo em `api/clientsRepository.ts` e cobrir o corpo em `clientsRepository.test.ts`.
- [x] T008 [US1] Schema, valores iniciais e troca da chave `TagIds` em `ClientFormPage/clientForm.ts` e
  `useClientFormPage.ts`; campo em `components/ClientPersonSection.tsx`.
- [x] T009 [US1] Testar em `clientForm.test.ts` e `ClientFormPage.test.tsx` o envio de `tagIds`, as etiquetas na
  edição, o limite e `Tag.NotFound` sob o campo.
- [x] T022 [US1] Trocar o campo de `ClientPersonSection.tsx` por `RemoteSelectField`; os testes de T009
  passam sem mudança.
- [ ] T010 [US1] Estender `e2e/clients.spec.ts`: criar pessoa com etiqueta e vê-la na edição. Cenário escrito;
  falta executá-lo contra o stack real.

## Transversais

- [x] T023 Reescrever a ADR 0090 para o `RemoteSelect`, com a versão em duas camadas entre as alternativas
  substituídas; índice das ADRs e `docs/ARCHITECTURE.md`.
- [x] T012 Rodar lint, Prettier, build e cobertura; conferir no navegador nos dois temas.

## Dependências e validação final

T017 e T018 antecedem T019; T019 antecede T020; T020 antecede T021; T021 antecede T022. T023 não depende do
código. Os gates de T012 e o e2e de T010 encerram a mudança.
