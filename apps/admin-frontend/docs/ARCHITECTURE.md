# admin-frontend — Architecture

Desenho vigente do frontend. Consulte a seção relacionada à mudança; o porquê e as alternativas
rejeitadas estão nas [decisões](../../../docs/decisions/README.md) 0012 e 0013. Versões, arquivos e gates
devem ser conferidos nos pins, no código e na configuração.

## 1. Shape

| Camada              | Responsabilidade                                                                     |
| ------------------- | ------------------------------------------------------------------------------------ |
| `app/`              | Composição de providers, rotas e shell; placeholders sem capacidade de negócio       |
| `features/<slice>/` | Fatia de negócio com `model/`, `api/`, `ui/` e `index.ts` público                    |
| `widgets/`          | Composições reutilizáveis de tela, com comportamento e sem domínio                   |
| `shared/`           | Infraestrutura transversal, valores compartilhados e primitivos sem regra de negócio |

A direção é `app → features → widgets → shared`. Widgets podem compor outros widgets sem ciclos.
Fora de uma fatia, seus consumidores importam apenas o barril `features/<slice>/index.ts`.
Dentro dela, a direção usual é `ui → model | api` e `api → model`; tipos de domínio pertencem a
`model/`, não à camada de transporte.

A regra [agenza/layer-boundaries](../eslint-rules/layerBoundaries.js), ligada no
[ESLint](../eslint.config.js), verifica importações para camadas superiores e acesso externo que
contorne o barril. Ela cobre arquivos nas quatro camadas; não verifica direção entre segmentos
dentro da fatia, ciclos, `src/main.tsx`, testes de suporte fora dessas camadas ou configurações.
Esses limites continuam na revisão. O adaptador OIDC
[sessionDriver](../src/features/auth/model/sessionDriver.ts) tem uma dependência intencional
`model → api` dentro de auth; o núcleo compartilhado de sessão não conhece OIDC
([ADR 0008](../../../docs/decisions/0008-authentication-session-and-ai-delegation.md)).

### Páginas, rotas e listas

Uma página tem sua pasta `ui/pages/<Page>/`: componente de apresentação, hook próprio quando houver
estado/efeitos e tipos do hook em arquivo irmão quando necessários. Subcomponentes ganham
`components/` quando tiverem conteúdo que justifique a separação.

Para decidir onde fica uma peça da `ui/` da fatia, siga esta ordem e pare na primeira que servir:

1. **Abre pela rota** (tem URL própria): `ui/pages/<Page>/`, mesmo quando aparece como diálogo.
2. **Abre pelo código**, sem URL, e é usado fora de uma página só: `ui/dialogs/<Dialog>/`, com hook,
   tipos e testes, como uma página.
3. **Não abre sozinho** e é usado por mais de um consumidor da fatia (página ou diálogo) ou exportado
   pelo barril: `ui/components/<Componente>/`, com seus tipos e testes. O que só existe por causa
   dele fica na mesma pasta; partes internas descem para `components/`.
4. **Serve a uma página só**: nos `components/` dela. Um formulário com uma entrada só fica na
   página e sobe para `ui/components/` quando ganha a segunda.

Uma entidade que também se cria por um seletor repete o desenho de etiquetas: o diálogo rápido
`<Entity>CreationDialog` em `dialogs/`, exportado pelo barril, e a casca, a validação e os campos
em `components/<Entity>Form/`, usados também pela página da rota. Cada entrada mantém seu hook: a
rota carrega por id e fecha navegando; o diálogo recebe o texto digitado e devolve o item criado.
Foram descartados um hook ou diálogo configurável para as duas entradas, que mistura rota e
callbacks, uma pasta `ui/forms/` com um `useQuickCreate` comum e o formulário de toda entidade em
`components/` desde o primeiro dia.

Hooks de página não são uma camada compartilhada de negócio; acessores de contexto, hooks genéricos
de widgets e utilitários como [useCloseRoute](../src/shared/hooks/useCloseRoute.ts) são
reutilizáveis.

Quando uma página usa `loader` ou `action`, eles ficam em `route.ts`, reexportados pelo barril para
[app/routes.tsx](../src/app/routes.tsx). Isso não obriga toda página a buscar dados no loader:
um loader bloqueante não permite que a própria página apresente seu carregamento. O cabeçalho
deriva das rotas e seus `handle`, por
[ADR 0012](../../../docs/decisions/0012-frontend-architecture-and-data.md).

[usePaginatedList](../src/widgets/paginated-list-section/use-paginated-list.ts) recebe o estado
controlado e o repositório. Os hooks de
[Pessoas](../src/features/clients/ui/pages/ClientListPage/useClientListPage.ts) e
[Etiquetas](../src/features/tags/ui/pages/TagListPage/useTagListPage.ts) fornecem esse estado com
[useSearchParamsState](../src/shared/hooks/useSearchParamsState.ts): filtros aplicados, página e
tamanho são lidos da query string na montagem e suas mudanças são escritas com `replace` na rota
dona da lista. O estado do formulário de filtros é separado; digitar não aplica a busca.

O widget pede dados nas ações, na montagem e ao corrigir uma página além do fim. Um efeito
dependente da query não dispara as buscas. Uma nova ação cancela a requisição anterior; respostas
canceladas não substituem a atual. `refetch` atualiza a consulta solicitada sem limpar as linhas,
inclusive quando chamado pelos tópicos da feature. O hook deriva carregamento/erro/sucesso da
resposta; uma lista vazia só é reconhecida depois de sucesso.

Barras de filtro são formulários React Hook Form com `SearchField` e `SelectField`
(`labelPlacement="inline"`); um botão Buscar aplica todos os filtros. Excluir é uma rota de diálogo
sobre a lista, aberta pela lixeira da linha, e fecha com `useCloseRoute`. Um link de menu para uma
lista vai ao caminho sem filtros; formulários e diálogos voltam com `navigate(-1)`.

### Componentes e formulários

Um primitivo em `shared/ui/<name>/` expõe seu `index.tsx`. Tipos próprios podem ficar em
`<name>.types.ts`; tipos derivados de estilos ficam junto de quem define os estilos.
`components/` serve para partes acopladas ou uma renderização cuja divisão melhora a leitura.
Partes triviais podem dividir um arquivo de primitivos; não criar um arquivo por elemento.
Reavalie a composição inteira ao alterá-la, sem refatorar áreas independentes por obrigação.

Use retornos antecipados para variantes e preserve uniões discriminadas até o ponto em que são
estreitadas. Uma base de props compartilhada se justifica quando três ou mais tipos irmãos repetem
os mesmos campos. Props necessárias para nome acessível devem ser obrigatórias quando o componente
não possui outra fonte desse nome. Remova variantes de tipo sem implementação e teste o efeito
observável de uma prop, não apenas sua aceitação.

[Base UI](../components.json) é a base dos primitivos; sua composição usa `render`.
Use tokens semânticos e o tema resolvido por atributo, preservando escolha explícita de tema e
contraste. Primitivos podem ter comportamento de interação e acessibilidade; composições de tela
reutilizáveis ficam em widgets. Cobertura e exclusões vêm da configuração, não da pasta.

Formulários usam React Hook Form e Zod com os controles de `shared/form/fields/`; a moldura visual
fica em `shared/ui/form-field/`. O tipo das props de um campo fica no arquivo do campo em
`components/`, derivado do primitivo que ele renderiza; `fields.types.ts` guarda só as peças que
vários campos compartilham e não importa nada de `shared/ui`. As receitas específicas pertencem à
[skill de formulário](../../../.claude/skills/agenza-form-field/SKILL.md).
Seleção de várias opções `{ id, name }` carregadas do backend, com busca e páginas, usa
[SearchSelect](../src/shared/ui/search-select/search-select.tsx) com a chamada paginada da feature; no
formulário, `SearchSelectField`
([ADR 0013](../../../docs/decisions/0013-frontend-ui-and-interaction.md)). A `creation` opcional
oferece criar o item ali mesmo; a feature desenha a criação e devolve o item, que entra selecionado.
Um diálogo de criação passa o `finalFocus` recebido ao `DialogContent`, para o foco voltar à busca.
`SelectField` continua para o `Select` simples.
Texto e rotas de produto são pt-BR; identificadores são inglês. A rota `/tags` é uma exceção
existente: renomear uma URL requer uma mudança própria de produto.

## 2. Talking to the backend

| Fonte                                                           | Responsabilidade                                                |
| --------------------------------------------------------------- | --------------------------------------------------------------- |
| [generateApiTypes.mjs](../scripts/generateApiTypes.mjs)         | Tipos OpenAPI e metadados de campos de data; não gera a fachada |
| [apiClient.ts](../src/shared/api/apiClient.ts)                  | Cliente openapi-fetch, credenciais atuais e headers de sessão   |
| [servicesFacade.ts](../src/shared/api/servicesFacade.ts)        | Versão, envelope, normalização de falhas e `ApiResult<T>`       |
| [servicesApi.ts](../src/shared/api/servicesApi.ts)              | Composição do cliente com a fonte compartilhada de credenciais  |
| [tagsRepository.ts](../src/features/tags/api/tagsRepository.ts) | Exemplo de delegação tipada entre feature e fachada             |

O repositório não repete token, tenant, versão, envelope ou tratamento de exceção. Os tipos de
domínio pertencem ao frontend; um mapeamento explícito só é necessário quando a forma de domínio e
a resposta divergem. As anotações de retorno mantêm a checagem estrutural contra o contrato gerado.

`servicesApi` resolve com `Result` em sucesso e falha. Para regras HTTP, consulte
[docs/API.md](../../../docs/API.md); para os resultados efetivamente normalizados, consulte
[servicesFacade.ts](../src/shared/api/servicesFacade.ts). A regeneração e sua checagem estão no
[README](../README.md#comandos). O contrato narrativo pode ter exemplos históricos; o schema e o
código vigente determinam a forma de um endpoint.

A conversão de `Result` em exceção existe em [unwrap.ts](../src/shared/api/unwrap.ts), somente na
fronteira de um loader ou de um eventual `queryFn` que sinalize erro por rejeição. Mutação e action
mantêm falhas esperadas como valores. Isso preserva a validação no formulário, sem convertê-la em
uma tela de erro.

[formErrors.ts](../src/shared/api/formErrors.ts) e
[applyApiProblem.ts](../src/shared/form/applyApiProblem.ts) levam os erros da API aos campos do
formulário, inclusive campos enviados com outro nome (`aliases`) e o link para o cadastro existente
num conflito de CPF; o procedimento está na
[skill de formulário](../../../.claude/skills/agenza-form-field/SKILL.md).

As superfícies usam mensagens e códigos do `ApiProblem` normalizado; ramificações dependem de
`code`/status, nunca do texto da mensagem. Preserve a representação do problema em erros de lista,
diálogos, banners e toasts. A política HTTP detalhada fica em [docs/API.md](../../../docs/API.md).

### Registros relacionados em confirmações

O [ConfirmDialog](../src/widgets/confirm-dialog/index.tsx) mostra os registros relacionados de
qualquer falha, sem configuração pela feature, e todo bloqueio oferece uma nova tentativa explícita.
O [leitor](../src/widgets/confirm-dialog/related-records.ts) é a única fonte desses registros:
grupos conhecidos (`Clients`, `Services`) com `meta.id` e `meta.name`, até 10 por tipo; um grupo
desconhecido com o código do problema aparece como “Outros vínculos”. Rótulos e rotas vêm da lista
de grupos conhecidos, nunca dos metadados, e nada é inferido do texto da mensagem. O caminho de
edição de pessoa fica em `shared/routes/clientPaths.ts` para que Etiquetas o use sem depender de
Pessoas.

## 3. Auth & tenancy

OIDC Authorization Code + PKCE usa identity-service e oidc-client-ts. O
[authClient](../src/features/auth/api/authClient.ts) configura a integração; o
[sessionDriver](../src/features/auth/model/sessionDriver.ts) adapta os eventos à máquina de sessão.
O núcleo em `shared/session/` não depende de React nem do provedor. AuthProvider expõe seu snapshot
ao React por contexto e assinatura da store.

O cliente decodifica `tenant_id` do access token para roteamento; não verifica sua assinatura.
A segurança está no backend, que valida token e correspondência do header. Nunca resolver tenant
de URL, query ou valor independente em localStorage. O usuário OIDC é persistido pela biblioteca
em localStorage para reutilização entre abas
([ADR 0008](../../../docs/decisions/0008-authentication-session-and-ai-delegation.md)); isso não o torna
uma fonte de autorização.

O cliente HTTP lê credenciais a cada chamada e falha fechado quando falta token/tenant. O gerador
remove o parâmetro de header de tenant dos tipos para que as features não o forneçam manualmente.
Essas proteções do frontend complementam a
[fronteira de servidor](../../../docs/decisions/0004-multi-tenancy.md).

### Session identity changes

A máquina compara subject e tenant na renovação. Troca de identidade limpa credenciais, aborta o
escopo de requisições e desmonta o estado protegido até login explícito. O adaptador OIDC rejeita
eventos tardios e tenta remover o usuário persistido; uma falha nessa limpeza é registrada sem
restaurar as credenciais da sessão bloqueada. O cliente HTTP combina cancelamento de sessão e do
consumidor. A implementação está na
[sessionStore](../src/shared/session/sessionStore.ts) e na
[ADR 0008](../../../docs/decisions/0008-authentication-session-and-ai-delegation.md).

## 4. Principles

As [regras da raiz](../../../AGENTS.md) continuam valendo. Aqui, a aplicação delas significa:

- Investir em regras de domínio e manter a infraestrutura de chamada concentrada.
- Reutilizar uma composição quando houver necessidade concreta; `entities/`, uma camada global
  de páginas ou um mapper não são pré-requisitos de uma feature.
- Manter lógica da página em seu hook e tipos compartilhados no limite correto.
- Depois de uma mutação assíncrona, verificar o ciclo de vida antes de navegar, fechar a página ou
  aplicar efeitos locais de UI. Tópicos do caso de uso podem ser publicados após sucesso mesmo que
  a página tenha desmontado. Cancelamento HTTP não substitui a proteção contra conclusão tardia.
- Escolher verificação pelo comportamento alterado e pelo risco; exclusão de cobertura não
  dispensa testar interação, nome acessível ou tratamento de falha.

## 5. Deferred, provisional & not-yet-built

- Placeholders em `app/pages/` são substituídos pela fatia correspondente quando a capacidade é
  implementada; a tabela de rotas mostra quais ainda existem.
- Não há biblioteca de server state. Sua introdução exige uma necessidade concreta de cache,
  revalidação ou sincronização que justifique substituir a forma atual
  ([ADR 0012](../../../docs/decisions/0012-frontend-architecture-and-data.md)).
- O cancelamento de lista pertence ao widget que solicita dados; o cancelamento por perda da sessão
  pertence à store. A fachada ainda normaliza abort de transporte como falha de rede; o consumidor
  que cancela verifica seu próprio signal antes de aplicar a resposta.
- Uma resposta HTTP de sessão inválida não altera por si só o snapshot OIDC. O tratamento
  compartilhado desse caso durante uma visita continua uma lacuna; não duplicá-lo em cada lista.
- O adaptador OIDC usa módulo concreto. Uma abstração de provedor só se justifica por integração ou
  custo de teste que a necessite. Logs usam a infraestrutura existente; telemetria externa depende
  de necessidade operacional.

Não são promessas de roadmap. Antes de propor uma abstração, conferir consumidores e evidência do
problema; o código e as decisões relevantes delimitam a escolha.

## 6. Toolchain & gates

Os pins de runtime vêm da raiz. Os comandos estão no [README](../README.md#comandos); os gates
efetivamente executados estão no [workflow](../../../.github/workflows/frontend-ci.yml).
Configuração TypeScript e [ESLint](../eslint.config.js) definem as restrições estáticas.
[vitest.config.ts](../vitest.config.ts) define os limiares e as exclusões nominais de cobertura;
não há exclusão global de `shared/ui/`.

Testes de unidade e componente ficam junto ao código, com Vitest, RTL e mocks de módulo.
Playwright e a checagem de contrato/OIDC usam o stack Aspire real. Consulte
[DEVELOPMENT](../../../docs/DEVELOPMENT.md) para o alcance e as limitações de cada gate.

## 7. Pointers

- [AGENTS do frontend](../AGENTS.md): roteamento para skills e consulta por tarefa.
- [README](../README.md): ambiente e manutenção de dependências.
