# Decisões: frontend

## arquitetura e acesso a dados

### Decisão

- **Camadas `app → features → widgets → shared`.** Uma feature é acessada de fora só pelo barril, e
  a regra ESLint `agenza/layer-boundaries` verifica isso. Widgets são composições com comportamento e
  sem domínio. Cada página tem seu hook, que concentra estado, efeitos e handlers.
- **Tipos de wire vêm do contrato OpenAPI gerado.** As chamadas passam pela fachada `servicesApi`,
  que injeta token, tenant e versão, desembrulha o envelope e devolve `ApiResult<T>` sem rejeitar.
  Um `Result` próprio, de poucas linhas, faz o resto. `unwrapOrThrow` só existe na fronteira do
  framework (loader).
- **Sem camada de cancelamento na fachada.** Quem pede os dados cancela: o widget de lista e a
  sessão. Quem cancela confere o próprio sinal antes de aplicar a resposta.
- **Sem biblioteca de server state por enquanto.** Ela entra quando houver um gatilho concreto: cache
  reaproveitado entre telas, dados que sobrevivem à navegação, ou revalidação e sincronização que a
  forma atual não resolve. Quando entrar, substitui o repositório.
- **Listas paginadas com estado controlado.** Filtros aplicados, página e tamanho ficam na query
  string (`useSearchParamsState`, com `replace`). A lista busca só na montagem, numa ação ou ao
  corrigir uma página além do fim, nunca por efeito ligado à query. Uma requisição por vez: a nova
  cancela a anterior.
- **Um `429` é um problema próprio** (`RATE_LIMIT_PROBLEM`), com mensagem do frontend. Sem retry
  automático e sem contagem regressiva; o retry manual existente basta.
- **O cabeçalho da página e a trilha vêm das rotas** (`handle: crumb(...)`), com seta para o nível
  de cima.
- **Erros da API chegam ao formulário por `applyApiProblem`**, ramificando por código e campo, nunca
  pelo texto. Um campo enviado com outro nome declara a troca em `aliases`.

Forma vigente: [apps/admin-frontend/docs/ARCHITECTURE.md](../../apps/admin-frontend/docs/ARCHITECTURE.md).

### Rejeitado

- **neverthrow ou Effect**, para algo que cabe em poucas linhas.
- **TanStack Query, SWR ou RTK Query agora.** Uma prova de conceito com TanStack também foi recusada.
- **`AbortController` passado pela fachada e pelos repositórios.**
- **Um adaptador que percorria todas as páginas** para manter uma lista sem paginação. Foi substituído
  quando Etiquetas passou a paginar.
- **Disparar a busca por efeito ligado à query**, `useFetcher().load()`, ou uma promise com `use()`
  e Suspense. Revalidam sozinhos, ou reestruturam a tela.
- **Um esquema de filtros com tipos inferidos**, Zod como leitor ou um flag de armazenamento
  `url | memory`. É estrutura demais para filtros que se leem em uma linha.
- **Contagem regressiva no botão de retry ou backoff automático na fachada.** Foi construído e
  removido a pedido do dono.
- **A trilha declarada em cada página** e a seta voltando pelo histórico.
- **Um `renameFieldErrors` separado, composto antes de `applyApiProblem`.** Cada página precisaria
  lembrar de chamá-lo.

## UI e interação

### Decisão

- **Base UI é a camada de primitivos.** Os componentes são código próprio em `src/shared/ui/`,
  adicionados pela CLI do shadcn. Toast e Combobox vêm do Base UI, sem `sonner` nem `cmdk`.
- **Tema de três estados** (`light`, `dark`, `system`), guardado como escolha e resolvido na hora, num
  store próprio em `shared/theme/`. O tema resolvido vai ao `identity-service` no login.
- **Barras de filtro são formulários React Hook Form** com os campos de `shared/form/fields/`
  (`SearchField`, `SelectField`), nunca partes de `shared/ui` montadas à mão. Um botão Buscar aplica
  todos os filtros; digitar não busca.
- **Seleção múltipla de registros do backend usa um único `SearchSelect`** em `shared/ui/`. Ele recebe
  a chamada paginada da feature e itens `{ id, name }` como vêm, sem mapper; quem chama desenha o
  item por `renderItem`. No formulário, `SearchSelectField`.
- **Excluir é uma rota de diálogo sobre a lista**, aberta por uma lixeira na linha. A edição não tem
  botão de excluir.
- **Um conflito de CPF ou e-mail oferece abrir o cadastro existente numa nova aba**, por
  `NewTabLink`, com a rota construída pela feature a partir do código e de `meta.clientId`.
- **Interação só por clique e pelo teclado nativo dos primitivos.** Não há atalhos de teclado
  próprios.
- **Mensagens de erro do backend são texto pt-BR curado** e aparecem como vêm.

Convenções de componentes e formulários:
[apps/admin-frontend/docs/ARCHITECTURE.md](../../apps/admin-frontend/docs/ARCHITECTURE.md) e as skills
de UI e formulário.

### Rejeitado

- **Continuar no Radix.** Ficaria fora do caminho padrão da CLI do shadcn e manteria `sonner` e
  `cmdk`.
- **Bibliotecas fechadas de componentes** (Mantine, HeroUI, Chakra): o código dos primitivos deixa de
  ser nosso.
- **`next-themes`**, por trazer maquinário de SSR para o que o store próprio faz em cerca de sessenta
  linhas, e **`light-dark()` no CSS**, porque o seletor manual ainda precisa controlar `color-scheme`.
- **Botões segmentados, abas ou um popover de "Filtros"** para a situação da lista.
- **Um `SearchSelect` de lista fixa embrulhado por um remoto.** A base carregava os estados do remoto.
- **Excluir pela página de edição**, ou pelos dois caminhos.
- **Atalhos de teclado customizados.** Foram removidos; voltar com eles exige uma ADR nova.
