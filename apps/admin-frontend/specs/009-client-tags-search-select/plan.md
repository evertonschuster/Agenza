# Plano: etiquetas no cadastro de pessoa com SearchSelect

**Branch**: `claude/multi-select-component-d9018b` | **Data**: 2026-10-29, redesenho em 2026-11-06 | **Spec**: [spec.md](spec.md)

## Abordagem

O seletor é reescrito do zero; nenhum arquivo da versão em duas camadas (`SearchSelect`,
`RemoteSearchSelect` e os seus Fields) é aproveitado. Ficam só os contratos já aprovados: a função de
listagem com a forma do `tagsRepository.list`, o valor com os itens inteiros e o uso no cadastro de pessoa.

Os primitivos do Combobox voltam a `src/shared/ui/combobox/` como o registry do shadcn (`base-nova`) os
gera, adaptados ao projeto: conteúdo do popup com a âncora, chips, chip com remover nomeado, input dos
chips, trigger, indicador da opção e a região de status. A paleta de comandos só divide com eles a classe
do `ComboboxEmpty`, que passa a valer também no novo conteúdo.

`src/shared/ui/search-select/` tem estes arquivos:

- `use-search-options.ts`: o que mostrar e quando pedir, sem conhecer o Base UI. O estado guarda a busca da
  lista exibida, os itens, o total, o pedido pronto da próxima página e uma fase: carregando a primeira
  página, carregando a próxima, pronta ou com falha, que guarda o problema e o pedido a repetir. Abrir pede
  a primeira página, exceto com uma busca digitada esperando os 300 ms; digitar reinicia os 300 ms e
  cancela na hora o pedido em andamento; `loadMore` pede a próxima só na fase pronta, sem pedido em
  andamento e sem busca esperando; `retry` repete o pedido que falhou, a não ser que uma busca digitada
  esteja esperando; `cancel`, chamado ao fechar, cancela, e a lista é descartada só quando a
  animação de fechar termina. A última página vem do tamanho de página que o
  servidor respondeu. Cada pedido cancela o anterior por `AbortController` e uma resposta cancelada é
  ignorada. As buscas partem de ações, nunca de um efeito sobre o texto.
- `search-select.tsx`: `SearchSelect` monta o Combobox com `multiple`, `filter={null}`, igualdade e valor
  por `id`, e tem três regras próprias: o teclado, em `keep-keys-in-picker.ts`, lido do estado que o Base UI
  põe no input (`aria-expanded` e `aria-activedescendant`), sem estado espelhado, com Enter que não envia o
  formulário da lista aberta e Esc que não apaga as escolhas da lista fechada; a rolagem, em
  `use-load-more-near-end.ts`, que avisa o hook a 40 px do fim e depois de cada página; e o limite, que
  desabilita as opções não marcadas e avisa. O componente escolhe pela fase o que mostrar abaixo da lista.
  Uma região de status no popup anuncia carregando, carregando mais e o limite; a lista fica com
  `aria-busy` durante um pedido, e o campo de busca aceita o `maxLength` de quem usa. O `index.ts` só
  reexporta o componente e os tipos.
- `components/`, uma parte por arquivo, como em `list-section` e `pagination`:
  `search-select-announcement`, `-limit-notice`, `-empty`, `-skeleton`, `-error` (falha com nova
  tentativa), `-progress` (progresso da paginação) e `-selection` (resumo da seleção com "Limpar
  seleção"). O `ComboboxEmpty` fica sempre montado, só com o texto trocado, como o Base UI exige. O texto
  do limite, usado pelo anúncio e pelo aviso, fica em `limit-notice.ts`.
- `search-select.types.ts`: o item `{ id, name }`, `SearchItemsQuery`, `LoadSearchItems` e as props, com o
  `renderItem` opcional que desenha o item na opção e no chip, mais os tipos dos hooks, da regra de teclado
  e das partes. O nome acessível é obrigatório: `aria-label` ou um `id` ligado a um rótulo.

Os tipos das partes do Combobox acrescentadas para o seletor ficam em `combobox.types.ts`.

`SearchSelectField`, em `src/shared/form/fields/`, liga o componente ao React Hook Form por
`ControlledField`, como o `SelectField`, sem comportamento próprio. Os tipos seguem os demais campos:
`name` é um caminho do formulário (`Path<T>`), o primeiro genérico é o do formulário e o segundo é o do
item, que tipa o `renderItem`. O formulário de pessoas desenha cada etiqueta com o `TagBadge`, exportado
pelo barril da feature de etiquetas e usado também na lista de etiquetas. O tipo das props fica
em `search-select-field.tsx`, derivado das props do `SearchSelect` sem as que o formulário fornece; o
`fields.types.ts` só guarda as peças genéricas, como `BaseFieldProps` e `FormFieldOwnedProps`.

No cadastro de pessoa, o formulário guarda as etiquetas inteiras (`tags`) e o schema converte a saída em
`tagIds`, de modo que `createClient`/`updateClient` recebem o `ClientInput` sem mudança no hook da página. A
falha do servidor no campo `TagIds` chega a `tags` pelos `aliases` do `applyApiProblem` (ADR 0092), porque
o nome do campo no formulário não é o do comando. O paliativo `tagIds: []` sai do repositório. Nada disso
muda no redesenho; `ClientPersonSection` só troca o campo.

## Referências e restrições aplicáveis

- [Arquitetura §1](../../docs/ARCHITECTURE.md#1-shape): o componente não importa features; pessoas acessa
  etiquetas pelo barril `@/features/tags`. O componente e o Field ficam em `shared`, como os demais
  controles de formulário; a requisição continua sendo da feature, que passa `loadItems`.
- [ADR 0089](../../../../docs/adr/0089-clients-tags.md): limite de 20, `Tag.NotFound`/`Client.TooManyTags` em
  `TagIds`, PUT substitui as etiquetas.
- [ADR 0074](../../../../docs/adr/0074-admin-frontend-tags-list-asks-only-when-told.md): a busca ao digitar
  e a rolagem são exceções de seletor, registradas na ADR 0091; páginas de listagem não mudam.
- [ADR 0039](../../../../docs/adr/0039-admin-frontend-base-ui-primitives.md): Base UI, sem dependência nova.
- Constituição: tipos gerados e fachada (IV) inalterados; o tenant continua no servidor (II).

## Arquivos e dependências

1. `src/shared/ui/search-select/`, `src/shared/ui/remote-search-select/` e os dois Fields com seus testes e
   tipos: removidos.
2. `src/shared/ui/combobox/`: primitivos gerados e adaptados.
3. `src/shared/ui/search-select/`: hook, componente, tipos e testes. Depende de 2.
4. `src/shared/form/fields/`: `SearchSelectField`, tipos, exportação e teste. Depende de 3.
5. `src/features/clients/ui/pages/ClientFormPage/components/ClientPersonSection.tsx`: troca do campo.
6. `docs/adr/0091-...`, o índice e `docs/ARCHITECTURE.md`.

## Riscos e validação

- Corrida de respostas e travas da paginação: testes do hook com timers falsos.
- Enter lido do input: os testes dentro de um `<form>` provam a opção destacada, a lista aberta sem
  destaque, o texto digitado com a lista fechada e o campo vazio, que envia.
- Aceite sem mudança: os testes de etiquetas do `ClientFormPage` e o `e2e/clients.spec.ts` acham o campo
  por papel e nome.
- Gates: ESLint, Prettier, `tsc`/build e cobertura do Vitest; e2e contra o stack real quando disponível, e
  conferência no navegador nos dois temas.
