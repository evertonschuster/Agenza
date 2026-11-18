# Decisões: frontend

Forma vigente e convenções:
[apps/admin-frontend/docs/ARCHITECTURE.md](../../apps/admin-frontend/docs/ARCHITECTURE.md).

## Arquitetura e acesso a dados

### Decisão

- **Sem camada de cancelamento na fachada.** Quem pede os dados cancela: o widget de lista e a
  sessão. Quem cancela confere o próprio sinal antes de aplicar a resposta.
- **Sem biblioteca de server state por enquanto.** Ela entra quando houver um gatilho concreto: cache
  reaproveitado entre telas, dados que sobrevivem à navegação, ou revalidação e sincronização que a
  forma atual não resolve. Quando entrar, substitui o repositório.
- **Uma lista busca só na montagem, numa ação ou ao corrigir uma página além do fim**, nunca por
  efeito ligado à query. Uma requisição por vez: a nova cancela a anterior.
- **Um `429` é um problema próprio** (`RATE_LIMIT_PROBLEM`), com mensagem do frontend. Sem retry
  automático e sem contagem regressiva; o retry manual existente basta.
- **O cabeçalho da página e a trilha vêm das rotas** (`handle: crumb(...)`), com seta para o nível
  de cima.

### Rejeitado

- **neverthrow ou Effect**, para algo que cabe em poucas linhas.
- **TanStack Query, SWR ou RTK Query agora.** Uma prova de conceito com TanStack também foi recusada.
- **`AbortController` passado pela fachada e pelos repositórios.**
- **Disparar a busca por efeito ligado à query**, `useFetcher().load()`, ou uma promise com `use()`
  e Suspense. Revalidam sozinhos, ou reestruturam a tela.
- **Um esquema de filtros com tipos inferidos**, Zod como leitor ou um flag de armazenamento
  `url | memory`. É estrutura demais para filtros que se leem em uma linha.
- **Contagem regressiva no botão de retry ou backoff automático na fachada.** Foi construído e
  removido a pedido do dono.
- **A trilha declarada em cada página** e a seta voltando pelo histórico.
- **Um `renameFieldErrors` separado, composto antes de `applyApiProblem`.** Cada página precisaria
  lembrar de chamá-lo.
- **Um hook ou diálogo configurável para criar pela rota e pelo seletor**, uma pasta `ui/forms/` com
  um `useQuickCreate` comum, ou o formulário de toda entidade em `components/` desde o primeiro dia.
  Misturam rota e callbacks, ou criam estrutura antes da segunda entrada.

## UI e interação

### Decisão

- **Base UI é a camada de primitivos**, com os componentes como código próprio adicionado pela CLI
  do shadcn. Toast e Combobox vêm do Base UI, sem `sonner` nem `cmdk`.
- **Tema de três estados** (`light`, `dark`, `system`), guardado como escolha e resolvido na hora,
  num store próprio. O tema resolvido vai ao `identity-service` no login.
- **Barras de filtro são formulários React Hook Form** com os campos compartilhados, nunca partes de
  primitivos montadas à mão. Um botão Buscar aplica todos os filtros; digitar não busca.
- **Excluir é uma rota de diálogo sobre a lista**, aberta por uma lixeira na linha. A edição não tem
  botão de excluir.
- **Interação só por clique e pelo teclado nativo dos primitivos.** Não há atalhos de teclado
  próprios.
- **Mensagens de erro do backend são texto pt-BR curado** e aparecem como vêm.

### Rejeitado

- **Continuar no Radix.** Ficaria fora do caminho padrão da CLI do shadcn e manteria `sonner` e
  `cmdk`.
- **Bibliotecas fechadas de componentes** (Mantine, HeroUI, Chakra): o código dos primitivos deixa de
  ser nosso.
- **`next-themes`**, por trazer maquinário de SSR para o que o store próprio faz em cerca de sessenta
  linhas, e **`light-dark()` no CSS**, porque o seletor manual ainda precisa controlar `color-scheme`.
- **Botões segmentados, abas ou um popover de "Filtros"** para escolher a situação (ativa ou inativa)
  numa lista. Ela é um campo da barra de filtro como os outros.
- **Um `SearchSelect` de lista fixa com uma variante remota por cima.** A base passava a carregar os
  estados da busca remota.
- **Excluir pela página de edição**, ou pelos dois caminhos.
- **Atalhos de teclado customizados.** Foram removidos; voltar com eles exige uma decisão nova.
