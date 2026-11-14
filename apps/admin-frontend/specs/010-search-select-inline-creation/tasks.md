---
description: 'Tarefas da mudança, ordenadas por dependências e validadas conforme o risco.'
---

# Tarefas: criar etiqueta sem sair do cadastro de pessoa

**Entradas**: [spec.md](spec.md) e [plan.md](plan.md).

## Formulário de etiqueta único

- [x] T001 Mover `tagForm.ts` (e `tagForm.test.ts`), `TagFormBody.tsx` e `TagFormHeader.tsx` de
  `src/features/tags/ui/pages/TagFormPage/` para `src/features/tags/ui/components/TagForm/`, criar a casca
  `TagFormDialog.tsx` e fazer o `TagFormPage.tsx` renderizá-la. Os testes atuais de `TagFormPage.test.tsx`
  passam sem mudança: detectam qualquer regressão na criação e edição pela tela de etiquetas (FR-007).
- [x] T002 [P] `suggestTagColor(name)` em `src/features/tags/model/tagColor.ts` e `tagColor.test.ts`.
  Removido depois da implementação, a pedido do dono: o diálogo rápido abre sem cor, como a tela de etiquetas
  (FR-008 revista).
- [x] T003 [US1] `TagCreateDialog.tsx`, `useTagCreateDialog.ts` e os tipos em
  `src/features/tags/ui/dialogs/TagCreateDialog/`, usando a casca de T001, o `tagFormSchema`, o
  `createTag` e o `applyApiProblem`; exportar `TagCreateDialog` em `src/features/tags/index.ts`.
- [x] T004 [US1] `TagCreateDialog.test.tsx`: nome recebido e vazio; nenhuma cor marcada, a escolhida mantida
  enquanto se digita e cor obrigatória antes de salvar; `Tag.DuplicateName` com campo sob o nome e sem campo no aviso do formulário;
  sucesso com o toast "Etiqueta criada", `tagSaved` publicado e `onCreated` com a etiqueta; Cancelar e Esc
  chamando `onCancel`; renderizado dentro de um `<form>` externo, salvar não dispara o envio dele (FR-009,
  FR-010, FR-011).

## US2 — Criar uma etiqueta sem buscar

- [x] T005 [P] [US3] Tipos `SearchSelectCreation` e `SearchSelectCreationRequest` e a prop `creation` em
  `src/shared/ui/search-select/search-select.types.ts`, exportados por `index.ts`; `creation-text.ts` e
  `creation-text.test.ts` cobrindo texto vazio, texto com espaços nas pontas, nome igual com outra caixa e
  acento, busca exibida diferente do texto atual, lista carregando e com falha (FR-004).
- [x] T006 [US2] **Prova do clique no campo.** Lista controlada em `search-select.tsx` e
  `components/search-select-create-button.tsx` dentro do `ComboboxChips`, com o pedido aberto renderizado
  fora do `<Combobox>`. Em `search-select.test.tsx`: com a lista fechada, clicar no botão chama o `render` sem
  pedir a listagem nem abrir a lista; com a lista aberta, fecha a lista e chama o `render`; o botão vem logo
  depois do campo no Tab e Enter nele abre a criação (FR-002). Se o clique focar a busca ou abrir a lista,
  pare e revise o plano antes de T007–T009: o botão sairia dos chips. Passou; os testes estão em
  `search-select-creation.test.tsx`. Com a lista aberta, o Base UI esconde o botão das tecnologias
  assistivas, e a linha é a entrada ali.
- [x] T007 [US2] `components/search-select-create-row.tsx` entre o progresso e a seleção. Testes: rótulo da
  ação sem busca; visível carregando, com falha e sem itens; destaque com a lista pronta e vazia; fora do Tab
  (FR-003). Depende de T006.
- [x] T008 [US2] Concluir e cancelar em `search-select.tsx`. Testes: `complete` acrescenta o item ao valor
  sem perder os anteriores; depois de concluir e de cancelar, pelo botão e pela linha, o foco está no input e
  a busca vazia; um `mousedown` ou uma tecla dentro do conteúdo renderizado não abre a lista (FR-005). Se o
  foco não ficar no input, troque o efeito pelo `finalFocus` do diálogo com o ref do input no pedido, como
  diz o plano, antes de T011. Com um elemento simples o efeito bastou; com o `Dialog` real o foco voltou
  ao botão do campo, então o pedido ganhou `finalFocus()`, passado pelo `TagCreateDialog` ao
  `DialogContent`, e um teste com o diálogo real prova a volta ao campo. Depende de T006.
- [x] T009 [US2] Limite em `search-select.tsx`: com o limite atingido, botão e linha desabilitados, o botão
  focável e com o texto do limite ligado por `aria-describedby`; sem `creation`, nem botão nem linha, e os
  testes atuais do `SearchSelect` passam sem mudança (FR-006, US3.2). Depende de T006 e T007.

## US1 — Criar uma etiqueta que não encontrei

- [x] T010 [US1] Rótulo com o texto e texto passado, pela função de T005, no botão e na linha. Testes em
  `search-select.test.tsx`: depois da busca sem resultado, a linha mostra o rótulo com o texto aparado e o
  `render` o recebe; com nome igual em outra caixa, rótulo da ação e texto vazio; o botão passa o mesmo texto
  sem mudar o que mostra (FR-004). Depende de T005, T007 e T008.

## US3 — Reutilizar a criação em outro seletor

- [x] T011 [US3] Em `src/shared/form/fields/components/search-select-field.test.tsx`, conferir que `creation`
  chega ao `SearchSelect` pelo Field e que o item concluído entra no valor do formulário. Depende de T008.

## Cadastro de pessoa

- [x] T012 [US1] [US2] Passar `creation` com o `TagCreateDialog` em
  `src/features/clients/ui/pages/ClientFormPage/components/ClientPersonSection.tsx`. Depende de T003, T009 e
  T010.
- [x] T013 [US1] [US2] Em `ClientFormPage.test.tsx`: criar uma etiqueta pelo botão e outra pela linha com a
  busca e salvar a pessoa com os ids das duas; salvar o diálogo não chama `createClient`/`updateClient`;
  cancelar mantém o restante do formulário preenchido; na edição, a etiqueta criada entra ao lado das já
  marcadas. Depende de T012.
- [x] T014 [US1] [US2] Estender `e2e/clients.spec.ts`: criar uma etiqueta pelo botão "Nova etiqueta" e outra
  pela linha "Criar etiqueta «…»", salvar a pessoa e vê-las na edição, contra o stack real (SC-001). Depende de
  T012. Passou contra o stack real descartável (Postgres 5433, serviços 5080/5081, Vite 5173), com a
  suíte e2e inteira: 16 passaram, 1 pulado (isolamento de tenant, que exige `AGENZA_DISPOSABLE_TEST_DB=1`).

## Transversais

- [x] T015 [P] `docs/adr/0093-admin-frontend-search-select-creation.md` com a decisão e as alternativas do
  protótipo (criar direto, painel no popup, opção na lista, link sob o campo); marcar na ADR 0091 a exclusão
  superada com o link para a 0093; índice em `docs/adr/README.md` e a linha do `SearchSelect` em
  `docs/ARCHITECTURE.md` §1.
- [x] T016 Rodar `npm run lint`, `npm run format:check`, `npm run build` e `npm run test:coverage`; conferir
  no navegador o campo, a linha e o diálogo nos dois temas e em largura de celular, com o botão e o texto
  cabendo no campo. Gates rodados: lint sem erros, Prettier, build e cobertura (107 arquivos, 1190 testes).
  Conferido no navegador por capturas do Playwright em 1280 px claro e escuro e 390 px de toque: sem
  rolagem horizontal, foco de volta ao campo depois de criar. O input dos chips perdeu a sombra do
  `:focus-visible` global (`shadow-none` em `combobox-chips.tsx`), que desenhava um retângulo terminando no botão.

## Dependências e validação final

T001 e T002 antecedem T003, que antecede T004. T005 e T006 não dependem da feature de etiquetas e podem
correr junto com T001–T004. T006 é a prova de que o botão pode ficar nos chips e bloqueia T007–T010; T008 é a
prova do foco e bloqueia T011 e T012. T012 espera T003, T009 e T010; T013 e T014 esperam T012. T015 não
depende do código. T016 e o e2e de T014 encerram a mudança.
