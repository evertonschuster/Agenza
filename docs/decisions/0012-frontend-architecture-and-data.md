# ADR 0012 — Frontend: arquitetura e acesso a dados

## Decisão

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

## Rejeitado

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
