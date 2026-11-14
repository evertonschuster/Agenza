# Plano: criar etiqueta sem sair do cadastro de pessoa

**Branch**: `claude/search-select-inline-creation-ba42bb` | **Data**: 2026-11-14 | **Spec**: [spec.md](spec.md)

## Abordagem

A entrega tem duas metades independentes: a criação genérica no `SearchSelect` e o formulário de etiqueta
único com o diálogo rápido. O cadastro de pessoa as liga. Não há mudança no backend nem nos tipos gerados:
`POST /api/v{version}/tags` já existe e o `tagsRepository.create` já o chama.

### Criação no `SearchSelect`

`search-select.types.ts` ganha a prop opcional `creation` e dois tipos exportados pelo `index.ts`:

```ts
interface SearchSelectCreation<T extends SearchSelectItem> {
  actionLabel: string;
  actionLabelFor: (text: string) => string;
  render: (request: SearchSelectCreationRequest<T>) => ReactNode;
}

interface SearchSelectCreationRequest<T> {
  text: string;
  finalFocus: () => HTMLElement | null;
  complete: (created: T) => void;
  cancel: () => void;
}
```

O `SearchSelectField` não muda: o tipo das suas props já deriva das do `SearchSelect`, e `creation` não está
entre as que o formulário fornece.

No `search-select.tsx`:

- **Lista controlada.** O Combobox recebe `open` de um estado do componente; o `onOpenChange` atual passa a
  também atualizar esse estado. Abrir a criação fecha a lista pelo mesmo caminho (`options.cancel()` e
  estado fechado); o `onOpenChangeComplete` continua descartando a lista. O Base UI, em várias seleções, já
  limpa o texto da busca quando o fechamento termina, o que dá a busca limpa de FR-005 sem controlar o texto.
- **Texto atual.** Um estado guarda o texto do campo a cada `onInputValueChange`, de qualquer motivo, porque
  o `searched` do hook é o texto da última busca enviada, 300 ms atrás. Só é lido para montar o pedido.
- **Rótulo e texto passado.** `creation-text.ts` exporta uma função pura que recebe o texto atual, a busca
  exibida, a fase e os itens carregados e devolve o rótulo da linha e o texto do pedido (FR-004). Um nome
  igual é procurado só com a fase pronta e a busca exibida igual ao texto aparado; a comparação ignora
  maiúsculas e acentos (`normalize('NFD')` sem marcas combinantes, `toLocaleLowerCase('pt-BR')`).
- **Pedido aberto.** Um estado guarda o `SearchSelectCreationRequest` aberto ou nada. `complete` acrescenta o
  item ao valor por `onValueChange([...value, created])`; ambos limpam o pedido e devolvem o foco ao input.
  O `render(request)` fica **fora** do `<Combobox>`, irmão dele num fragmento, desenhado pelo componente
  `search-select-creation-slot.tsx` para que as funções do pedido cheguem como props, e não numa chamada
  durante o render, que as regras do React Compiler recusam, para que eventos do diálogo,
  que sobem pela árvore do React mesmo dentro de um portal, não cheguem ao `onMouseDown` do `ComboboxChips`
  nem ao teclado do input.
- **Foco no input.** O input é achado dentro da âncora que o componente já tem, e o `inputRef` do
  formulário segue intocado: combinar refs atribuiria ao ref recebido, o que o React Compiler recusa.
  Concluir e cancelar desmontam o pedido com `flushSync` e focam o input. Como um diálogo do Base UI devolve
  o foco a quem o abriu, o pedido leva `finalFocus()`, que o diálogo passa ao `DialogContent`; o
  `TagFormShell` aceita esse `finalFocus` opcional. Esta foi a alternativa prevista: o teste com o diálogo
  real mostrou o foco voltando ao botão do campo.
- **Limite.** Com `reachedLimit`, o botão e a linha ficam desabilitados com `focusableWhenDisabled`, como o
  "Limpar seleção"; o botão recebe `aria-describedby` apontando para o texto do limite (`limitNoticeOf`).

Duas partes novas em `components/`, uma por arquivo como as demais:

- Com a lista aberta, o Base UI esconde das tecnologias assistivas tudo menos a busca e o popup, inclusive o
  botão; ali, a linha é a entrada de criação.
- `search-select-create-button.tsx`: `Button variant="ghost" size="xs"` com o ícone `Plus` do `lucide-react`
  e o `actionLabel` visível, dentro do `ComboboxChips`, antes do `ComboboxTrigger`. Entra no Tab. Lido no Base
  UI 1.8: o `onMouseDown` dos chips ignora alvos interativos (`handleInputPress` com `isInteractiveElement`),
  então o clique não foca a busca nem abre a lista, e o `outsidePress` ignora o que está dentro dos chips,
  então ele também não fecha a lista por clique de fora. Quem fecha é o próprio componente.
- `search-select-create-row.tsx`: linha entre o `SearchSelectProgress` e o `SearchSelectSelection`, com borda
  superior como o rodapé, `Button variant="ghost"` de largura total, alinhado à esquerda, com ícone e rótulo;
  o texto com aspas fica truncado numa linha. Fica fora do Tab como os botões já existentes no popup. Destaque
  (`bg-accent`) com a fase pronta e nenhum item.

### Formulário de etiqueta único

A validação, os campos e o título saem da pasta da página porque passam a ter dois usuários, como pede a
estrutura por fatia da feature:

- `features/tags/ui/components/TagForm/`: `tagForm.ts` (+ teste), `TagFormBody.tsx` e
  `TagFormShell.tsx`, a casca comum `Dialog` → `DialogContent` → `FormProvider` → `form` → cabeçalho → corpo
  (ou `FormFieldsSkeleton`) → `DialogFormFooter`. A casca recebe as props como objeto, sem lógica: `methods`,
  `onSubmit`, `onOpenChange`, `isEdit`, `isLoading`, `isSaving` e `canSubmit`.
- `TagFormPage.tsx` passa a renderizar a casca; `useTagFormPage.ts` não muda de comportamento.
- `features/tags/ui/dialogs/TagQuickCreateDialog/`: `TagQuickCreateDialog.tsx`, `useTagQuickCreateDialog.ts` e os tipos.
  Recebe `name`, `onCreated(tag)` e `onCancel()`. O hook cria o `useForm` com o mesmo `tagFormSchema`, valores
  iniciais `toTagFormFieldValues()` com o nome recebido e sem cor, como a página (FR-008). Ao salvar, chama o mesmo
  `createTag`, mostra o toast "Etiqueta criada" com `"<nome>" foi criada e selecionada.` e chama
  `onCreated`; na falha, `applyApiProblem`, como a página. O `<form>` do diálogo fica, na árvore do React,
  dentro do `<form>` da pessoa, e o envio subiria até ele (FR-010): quem impede é o slot do `SearchSelect`,
  que para o evento `submit` de qualquer criação. Fechar sem salvar chama `onCancel`.
- O barril `features/tags/index.ts` exporta `TagQuickCreateDialog`.

### Cadastro de pessoa

`ClientPersonSection.tsx` passa `creation` ao `SearchSelectField`: o rótulo "Nova etiqueta", o rótulo com o
texto "Criar etiqueta «texto»" e o `render` com o `TagQuickCreateDialog`. A `Tag` criada satisfaz o `ClientTag`
do formulário; o schema da pessoa continua convertendo `tags` em `tagIds`.

## Referências e restrições aplicáveis

- [Arquitetura §1](../../docs/ARCHITECTURE.md#1-shape): o `SearchSelect` não importa features; pessoas
  acessa etiquetas só pelo barril. A página compõe; estado e efeitos ficam nos hooks (`useTagFormPage`,
  `useTagQuickCreateDialog`).
- [ADR 0091](../../../../docs/adr/0091-admin-frontend-search-select-and-client-tags.md): a exclusão "qualquer
  criação a partir do seletor" é revista por uma ADR nova; o restante da 0091 vale.
- [ADR 0039](../../../../docs/adr/0039-admin-frontend-base-ui-primitives.md): Base UI, sem dependência nova;
  o ícone vem do `lucide-react`, já usado pelos primitivos.
- Nenhum atalho de teclado próprio, como no restante do app; o botão entra pelo Tab comum.
- Erros do servidor mostrados como chegam e ramificados por código; sem nova tentativa automática.
- Constituição: tipos gerados e fachada (IV) inalterados; o tenant continua vindo do token (II).

## Arquivos e dependências

1. `src/features/tags/ui/components/TagForm/` com os arquivos movidos e a casca; `TagFormPage.tsx` usando a
   casca. Os testes atuais do `TagFormPage` provam que nada mudou para a tela de etiquetas.
2. Removido depois da implementação: a sugestão de cor (`suggestTagColor`) saiu a pedido do dono.
3. `src/features/tags/ui/dialogs/TagQuickCreateDialog/` e teste; exportação no barril. Depende de 1 e 2.
4. `src/shared/ui/search-select/`: tipos, `creation-text.ts` e teste, as três partes (botão, linha e slot),
   o componente e `search-select-creation.test.tsx`. Independe de 1 a 3.
5. `src/features/clients/ui/pages/ClientFormPage/components/ClientPersonSection.tsx`. Depende de 3 e 4.
6. Testes do `ClientFormPage` e `e2e/clients.spec.ts`. Depende de 5.
7. `docs/adr/0093-admin-frontend-search-select-creation.md`, o índice de ADRs e a linha do `SearchSelect` em
   `docs/ARCHITECTURE.md` §1.

## Riscos e validação

- **Clique no botão dentro dos chips** (risco da spec): a leitura do Base UI 1.8 indica que ele não foca a
  busca nem abre a lista. Prova: teste do componente clicando no botão com a lista fechada e aberta, sem
  pedido de listagem novo e com o diálogo aberto.
- **Envio subindo para o formulário da pessoa**: teste do `ClientFormPage` que salva o diálogo e confere que
  `createClient`/`updateClient` não foi chamado até a pessoa clicar em "Salvar pessoa", e teste do
  `TagQuickCreateDialog` dentro de um `<form>` externo.
- **Foco depois de fechar**: testes com `userEvent` real conferindo o foco no input depois de salvar e de
  cancelar, pelo botão e pela linha. Se a devolução de foco do diálogo vencer, o plano troca o efeito por
  `finalFocus` do `DialogContent` com o ref do input passado no pedido.
- **Rótulo e texto passado**: testes puros de `creation-text.ts` (texto vazio, aparado, nome igual com outra
  caixa e acento, busca ainda não exibida, falha) e testes do componente para a linha em cada fase.
- **Limite**: botão e linha desabilitados e focáveis, com o texto do limite ligado ao botão.
- **Sem `creation`**: os testes atuais do `SearchSelect` continuam passando sem mudança, e um teste confere
  que nem o botão nem a linha aparecem.
- **Diálogo rápido**: nome recebido, nenhuma cor marcada e cor obrigatória antes de salvar,
  `Tag.DuplicateName` sob o nome e sem campo no aviso, sucesso com toast, `tagSaved` e `onCreated`.
- **Aceite real**: novo caso no `e2e/clients.spec.ts` criando uma etiqueta pelo botão e outra pela linha com
  a busca, salvando a pessoa e reabrindo a edição com as duas (SC-001), contra o stack real quando disponível.
- Gates: ESLint (direção entre camadas e barril), Prettier, `tsc`/build e cobertura do Vitest; conferência no
  navegador nos dois temas e em largura de celular, com o botão e o texto cabendo no campo.
