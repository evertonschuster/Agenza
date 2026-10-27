# admin-frontend — Architecture

Desenho vigente do frontend. Consulte a seção relacionada à mudança; o histórico e as alternativas
estão nas [ADRs](../../../docs/adr/README.md) e no Git (§5). Versões, arquivos existentes e gates
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
([ADR 0037](../../../docs/adr/0037-admin-frontend-session-core-in-shared.md)).

### Páginas, rotas e listas

Uma página tem sua pasta `ui/pages/<Page>/`: componente de apresentação, hook próprio quando houver
estado/efeitos e tipos do hook em arquivo irmão quando necessários. Subcomponentes ganham
`components/` quando tiverem conteúdo que justifique a separação. Hooks de página não são uma
camada compartilhada de negócio; acessores de contexto, hooks genéricos de widgets e utilitários
como [useCloseRoute](../src/shared/hooks/useCloseRoute.ts) são reutilizáveis.

Quando uma página usa `loader` ou `action`, eles ficam em `route.ts`, reexportados pelo barril para
[app/routes.tsx](../src/app/routes.tsx). Isso não obriga toda página a buscar dados no loader:
um loader bloqueante não permite que a própria página apresente seu carregamento. O cabeçalho
deriva das rotas e seus `handle`, por
[ADR 0079](../../../docs/adr/0079-admin-frontend-page-header-from-routes.md).

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

As ADRs [0072](../../../docs/adr/0072-admin-frontend-paged-list-state-in-the-hook.md) e
[0074](../../../docs/adr/0074-admin-frontend-tags-list-asks-only-when-told.md) ainda descrevem a etapa
em que essas listas ficavam fora da URL. Para o comportamento vigente, confira os hooks acima e o
[commit que introduziu o estado na URL](https://github.com/evertonschuster/Agenza/commit/fa07d965).
A anotação dessas decisões históricas pertence à frente de governança; este guia não recomenda
restaurar o comportamento anterior.

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
fica em `shared/ui/form-field/`. As receitas específicas pertencem à
[skill de formulário](../../../.claude/skills/agenza-form-field/SKILL.md).
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

[formErrors.ts](../src/shared/api/formErrors.ts) interpreta paths e preserva mensagem, código e
metadados; [applyApiProblem.ts](../src/shared/form/applyApiProblem.ts) faz a ponte para React Hook Form.
Os paths vêm dos valores atuais, incluindo arrays e objetos aninhados; campos ausentes dos valores
não são reconhecidos como campos do formulário. Paths desconhecidos e mensagens gerais chegam à
raiz. Foco depende de uma referência registrada e focável; uma coleção pode ter erro sem recebê-lo.

As superfícies usam mensagens e códigos do `ApiProblem` normalizado; ramificações dependem de
`code`/status, nunca do texto da mensagem. Preserve a representação do problema em erros de lista,
diálogos, banners e toasts. A política HTTP detalhada deve permanecer na fonte de contrato, sem
tabelas concorrentes nas skills de frontend.

### Existing person on a CPF conflict

A seção de pessoa observa os erros atuais de CPF/e-mail. Código e `meta.clientId` determinam o
link; o destino é uma rota interna construída pela feature, nunca uma URL recebida nos metadados.
A duração do link acompanha o erro do campo, sem estado paralelo no hook da página.
[NewTabLink](../src/shared/ui/new-tab-link/index.tsx) concentra a apresentação e os atributos de
abertura; a feature mantém o domínio. Ver
[ADR 0085](../../../docs/adr/0085-admin-frontend-cpf-link-from-field-error.md) e
[ADR 0086](../../../docs/adr/0086-admin-frontend-reusable-new-tab-link.md).

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
([ADR 0036](../../../docs/adr/0036-admin-frontend-oidc-session-in-localstorage.md)); isso não o torna
uma fonte de autorização.

O cliente HTTP lê credenciais a cada chamada e falha fechado quando falta token/tenant. O gerador
remove o parâmetro de header de tenant dos tipos para que as features não o forneçam manualmente.
Essas proteções do frontend complementam a
[fronteira de servidor](../../../docs/adr/0006-tenant-header-base-entity-generic-repository.md).

### Session identity changes

A máquina compara subject e tenant na renovação. Troca de identidade limpa credenciais, aborta o
escopo de requisições e desmonta o estado protegido até login explícito. O adaptador OIDC rejeita
eventos tardios e tenta remover o usuário persistido; uma falha nessa limpeza é registrada sem
restaurar as credenciais da sessão bloqueada. O cliente HTTP combina cancelamento de sessão e do
consumidor. A implementação está na
[sessionStore](../src/shared/session/sessionStore.ts) e na
[ADR 0083](../../../docs/adr/0083-admin-frontend-reject-session-identity-changes.md).

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

## 5. Decisions log

As decisões e suas substituições estão no [índice de ADRs](../../../docs/adr/README.md).
Abra apenas as preocupações afetadas pela tarefa.

A cronologia de tentativas e revisões que ocupava esta seção permanece na
[versão anterior deste guia](https://github.com/evertonschuster/Agenza/blob/8e9645259932894f0b9aa6cc9b4737659f3d3097/apps/admin-frontend/docs/ARCHITECTURE.md#5-decisions-log)
e no histórico Git. Referências antigas a uma linha desse log devem ser consultadas nessa versão;
não são instrução para reproduzir uma implementação intermediária.

## 6. Deferred, provisional & not-yet-built

- Placeholders em `app/pages/` são substituídos pela fatia correspondente quando a capacidade é
  implementada; a tabela de rotas mostra quais ainda existem.
- Não há biblioteca de server state. Sua introdução exige uma necessidade concreta de cache,
  revalidação ou sincronização que justifique substituir a forma atual
  ([ADR 0035](../../../docs/adr/0035-admin-frontend-no-server-state-library.md)).
- O cancelamento de lista pertence ao widget que solicita dados; o cancelamento por perda da sessão
  pertence à store. A fachada ainda normaliza abort de transporte como falha de rede; o consumidor
  que cancela verifica seu próprio signal antes de aplicar a resposta.
- Uma resposta HTTP de sessão inválida não altera por si só o snapshot OIDC. O tratamento
  compartilhado desse caso durante uma visita continua uma lacuna; não duplicá-lo em cada lista.
- O adaptador OIDC usa módulo concreto. Uma abstração de provedor só se justifica por integração ou
  custo de teste que a necessite. Logs usam a infraestrutura existente; telemetria externa depende
  de necessidade operacional.

Não são promessas de roadmap. Antes de propor uma abstração, conferir consumidores e evidência do
problema; o código e as ADRs relevantes delimitam a decisão.

## 7. Toolchain & gates

Os pins de runtime vêm da raiz. Os comandos estão no [README](../README.md#comandos); os gates
efetivamente executados estão no [workflow](../../../.github/workflows/frontend-ci.yml).
Configuração TypeScript e [ESLint](../eslint.config.js) definem as restrições estáticas.
[vitest.config.ts](../vitest.config.ts) define os limiares e as exclusões nominais de cobertura;
não há exclusão global de `shared/ui/`.

Testes de unidade e componente ficam junto ao código, com Vitest, RTL e mocks de módulo.
Playwright e a checagem de contrato/OIDC usam o stack Aspire real. Consulte
[QUALITY](../../../docs/QUALITY.md) para o alcance e as limitações de cada gate.

## 8. Pointers

- [Constituição](../.specify/memory/constitution.md): restrições do planejamento.
- [AGENTS do frontend](../AGENTS.md): roteamento para skills e consulta por tarefa.
- [README](../README.md): ambiente e manutenção de dependências.
