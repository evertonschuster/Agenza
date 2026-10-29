# Plano: etiquetas no cadastro de pessoa com SearchSelect

**Branch**: `claude/multi-select-component-d9018b` | **Data**: 2026-10-29 | **Spec**: [spec.md](spec.md)

## Abordagem

`SearchSelect` é um primitivo em `src/shared/ui/search-select/`, composto sobre o `Combobox` do Base UI já
instalado e genérico em `T extends { id: string; name: string }`. Recebe `items`; `multiple` decide o modo,
`Chips`/`Chip`/`ChipRemove` desenham as seleções e o Base UI filtra a lista pelo texto digitado. Não faz
requisições. Uma fonte que carrega itens se conecta por props opcionais: `onSearchChange` recebe o texto e
desliga o filtro local (`filter={null}`), `onOpenChange` avisa abertura e fechamento, e `loading`, `failure`
e `more` mostram o estado da fonte.

`RemoteSearchSelect`, em `src/shared/ui/remote-search-select/`, é essa fonte para o backend: envolve o
`SearchSelect` com `use-remote-items.ts` e recebe `loadItems(query, signal)`, com a mesma assinatura do
`fetchPage` de `usePaginatedList`; `tagsRepository.list` já a satisfaz, sem adaptador. O hook usa um
`AbortController` por requisição, como `usePaginatedList`; busca 300 ms depois da última tecla, somente para
mudanças digitadas (motivo `input-change` do Base UI); carrega a primeira página ao abrir, exceto quando a
abertura veio de uma busca digitada pendente; "Carregar mais" acrescenta a próxima; fechar ou desmontar
cancela. A falha mostra o título do problema como recebido, com "Tentar novamente".

`SearchSelectField` e `RemoteSearchSelectField` em `src/shared/form/fields/` ligam cada primitivo ao React
Hook Form por `ControlledField`, como o `SelectField`.

No cadastro de pessoa, o formulário guarda as etiquetas inteiras (`tags`) e o schema converte a saída em
`tagIds`, de modo que `createClient`/`updateClient` recebem o `ClientInput` sem mudança no hook da página. A
falha do servidor no campo `TagIds` tem sua chave trocada para `tags` antes de `applyApiProblem`, porque o
nome do campo no formulário não é o do comando. O paliativo `tagIds: []` sai do repositório.

## Referências e restrições aplicáveis

- [Arquitetura §1](../../docs/ARCHITECTURE.md#1-shape): o primitivo não importa features; pessoas acessa
  etiquetas pelo barril `@/features/tags`, que passa a exportar `tagsRepository`.
- [ADR 0089](../../../../docs/adr/0089-clients-tags.md): limite de 20, `Tag.NotFound`/`Client.TooManyTags` em
  `TagIds`, PUT substitui as etiquetas.
- [ADR 0074](../../../../docs/adr/0074-admin-frontend-tags-list-asks-only-when-told.md): a busca ao digitar
  é uma exceção de seletor, registrada na ADR 0090 desta mudança; páginas de listagem não mudam.
- [ADR 0039](../../../../docs/adr/0039-admin-frontend-base-ui-primitives.md): Base UI, sem dependência nova.
- Constituição: tipos gerados e fachada (IV) inalterados; o tenant continua no servidor (II).

## Arquivos e dependências

1. `src/shared/ui/search-select/`: tipos, componente sobre lista fixa e partes; testes.
2. `src/shared/ui/remote-search-select/`: tipos, hook de carregamento e componente remoto; testes.
3. `src/shared/form/fields/`: `SearchSelectField`, `RemoteSearchSelectField`, tipos e exportação; testes.
4. `src/features/tags/`: exportação de `tagsRepository` no barril.
5. `src/features/clients/`: modelo (`ClientTag`, `tags`, `tagIds`, `CLIENT_MAX_TAGS`), repositório, schema e
   valores do formulário, troca da chave do problema, campo em `ClientPersonSection`; testes.
6. `e2e/clients.spec.ts`: criar uma pessoa com etiqueta e conferir que a edição a mostra.
7. `docs/adr/0090-...` e o índice; `docs/ARCHITECTURE.md` se citar os primitivos de seleção.

## Riscos e validação

- Corrida de respostas: teste com timers falsos prova que uma busca nova cancela a anterior e que a resposta
  cancelada não aparece.
- As duas camadas e os dois modos: testes da base cobrem lista fixa, filtro local e as props de fonte;
  testes do remoto cobrem a chamada, a busca e a paginação; ambos cobrem marcar, desmarcar, remover pela pílula, limite, uma seleção com
  limpar, teclado e nomes acessíveis.
- Envio: testes do formulário e do repositório provam `tagIds` na criação e na edição e a etiqueta inicial na
  edição; `Tag.NotFound` aparece sob o campo.
- Gates: ESLint, Prettier, `tsc`/build, cobertura do Vitest e drift do OpenAPI; e2e contra o stack real quando
  disponível, e conferência no navegador.
