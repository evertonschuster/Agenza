# API — convenções de request/response do backend

Este guia descreve a fronteira dos controllers de negócio do services-service que usam o pipeline
compartilhado de Result. Saúde, documentação de desenvolvimento e protocolos OIDC têm contratos
próprios. Schemas, parâmetros e códigos de cada operação pertencem ao controller, ao OpenAPI e ao
código da feature; aqui ficam as convenções que o consumidor precisa conhecer.

## 1. Onde isso mora

| Responsabilidade                         | Fonte                                                                                                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Envelope e conversão de Result para HTTP | [ResultExtensions](../backend/shared/Admin.SharedKernel.AspNetCore/ResultExtensions.cs) e [ApiResponse](../backend/shared/Admin.SharedKernel.AspNetCore/ApiResponse.cs)                                 |
| Problemas e erros por campo              | [ApiProblemDetailsFactory](../backend/shared/Admin.SharedKernel.AspNetCore/ApiProblemDetailsFactory.cs)                                                                                                 |
| Autorização e tenant                     | [Configuração do serviço](../backend/services/services-service/ServicesService.Api/Program.cs) e [TenantHeaderFilter](../backend/shared/Admin.Identity.Client/TenantHeaderFilter.cs)                    |
| Rotas e respostas declaradas             | [Controllers](../backend/services/services-service/ServicesService.Api/Controllers) e [documentação OpenAPI](../backend/services/services-service/ServicesService.Api/Setup/DocumentationExtensions.cs) |
| Normalização no frontend                 | [servicesFacade.ts](../apps/admin-frontend/src/shared/api/servicesFacade.ts)                                                                                                                            |
| Portas e composição local                | [AppHost](../backend/AppHost/AppHost.cs)                                                                                                                                                                |

As regras das camadas e os exemplos atuais de backend estão na
[arquitetura](../backend/docs/ARCHITECTURE.md). Use o [índice de ADRs](adr/README.md) para consultar
o motivo de uma decisão relevante, sem tratar observações históricas como uma execução atual.

## 2. Autenticação e tenant — duas checagens, uma mensagem

A configuração do serviço exige autenticação, salvo endpoints explicitamente anônimos. Nas ações
sujeitas ao TenantHeaderFilter, o header X-Tenant-Id precisa ser um UUID igual à claim tenant_id do
token validado. Claim ou header ausentes, inválidos ou divergentes recebem a mesma rejeição.
IgnoreTenant dispensa essa comparação, mas não concede acesso anônimo.

| Rejeição                                        | Status | Forma                                               |
| ----------------------------------------------- | ------ | --------------------------------------------------- |
| Autenticação obrigatória ou credencial inválida | 401    | Problema de autorização do pipeline compartilhado   |
| Autorização insuficiente                        | 403    | Problema de autorização do pipeline compartilhado   |
| Contexto de tenant inválido                     | 403    | ProblemDetails reduzido, com Tenant.ContextMismatch |

O problema reduzido do filtro inclui type, title, status e code; não acrescenta traceId,
correlationId nem errors. A claim validada continua sendo a fonte de tenant do servidor:
o header não autoriza acesso ([ADR 0006](adr/0006-tenant-header-base-entity-generic-repository.md)).
Um consumidor não deve tentar resolver um 403 escolhendo outro tenant.

## 3. Envelope de sucesso — ApiResponse

A conversão genérica de Result envolve o valor de um ObjectResult em
{ data, success, timestamp, traceId, correlationId }. O status e, numa criação, o Location são
definidos pelo controller. Uma operação sem conteúdo, como delete com 204, não recebe esse corpo.

A listagem de etiquetas retorna uma página, conforme o
[TagsController](../backend/services/services-service/ServicesService.Api/Controllers/TagsController.cs),
a [query](../backend/services/services-service/ServicesService.Application/Tags/ListTags/ListTagsQuery.cs)
e o [consumidor](../apps/admin-frontend/src/features/tags/api/tagsRepository.ts).
Exemplo ilustrativo de página sem resultados, omitindo os campos de rastreio:

```json
{
  "data": { "items": [], "totalCount": 0, "page": 1, "pageSize": 20 },
  "success": true
}
```

Uma página além da última pode ser um sucesso com items vazio, total real e página pedida.
Regras de paginação e busca pertencem ao validator e ao repositório da operação.

No JSON, decimais são números sem garantia de zeros à direita; quem exibe formata moeda e percentual.
Datas de calendário usam yyyy-MM-dd; instantes são UTC. Os enums do formato compartilhado são
strings camelCase. A conversão de datas para o frontend é feita pelo
[cliente](../apps/admin-frontend/src/shared/api/apiClient.ts) com os campos produzidos pelo
[gerador](../apps/admin-frontend/scripts/generateApiTypes.mjs), não por cada repositório.

## 4. Falhas na fronteira HTTP

O status, o Content-Type e a declaração OpenAPI não garantem, sozinhos, que o corpo tenha todos os
campos de ApiProblemDetails. A rejeição pode acontecer na aplicação, em um filtro ou antes da action.

### 4.1 Forma canônica — ApiProblemDetailsFactory

A factory usa type, title, status, code, traceId, correlationId e errors. Em validação, o título
é genérico; o código específico pode estar no topo ou nas entradas por campo, conforme a origem.
Erros de aplicação usam a mensagem do Error no título.

| Origem                                                                         | Conteúdo de errors                                  |
| ------------------------------------------------------------------------------ | --------------------------------------------------- |
| Validator com FieldErrors                                                      | Uma lista de entradas por caminho de campo          |
| Domínio ou aplicação sem FieldErrors                                           | O erro sob a chave vazia ""                         |
| Conflito com campo informado pelo handler                                      | Entradas no campo correspondente, com meta opcional |
| Autorização, erro inesperado ou rejeição de leitura do transporte pela factory | Objeto vazio                                        |

Cada entrada pode conter code, message e meta. Meta é um mapa de strings, omitido quando nulo;
carrega contexto que a feature interpreta após conferir o código, como o identificador de um
cadastro em conflito. Não trate um metadado arbitrário como URL ou autorização de acesso.

A factory converte caminhos C# para camelCase por segmento, preservando índices:
Guardians[0].Name vira guardians[0].name
([ADR 0051](adr/0051-camelcase-error-keys-on-the-wire.md)).
A chave vazia representa uma mensagem geral, não um campo de formulário.

### 4.2 Forma reduzida do filtro de tenant

Tenant.ContextMismatch usa o ProblemDetails reduzido descrito no §2. O consumidor precisa
aceitar a ausência dos campos enriquecidos da factory; uma rejeição de tenant não é uma falha de rede.

### 4.3 Falha do model binding — antes do dispatcher

O [mapeamento do ModelState](../backend/shared/Admin.SharedKernel.AspNetCore/MvcBuilderExtensions.cs)
também usa a factory canônica, com Validation.Failed no topo e nas entradas. Propriedades ausentes,
JSON malformado, tipos incorretos ou valores recusados no binding não chegam ao validator/handler.

O [mapper](../backend/shared/Admin.SharedKernel.AspNetCore/ModelStateErrorMapper.cs) preserva as
mensagens do ModelState. Mensagens do framework podem estar em inglês e conter nomes internos ou
posição do parser. Value objects compartilhados e o binder de enum de query/rota fornecem mensagens
próprias em pt-BR. O formato canônico, portanto, não garante o idioma de cada mensagem.

Uma falha de leitura do corpo pode acrescentar a chave do parâmetro da action, como command,
além do caminho que falhou ou da chave vazia. O backend não remove essa entrada. O parser de JSON
pode parar no primeiro valor inválido; não espere a mesma coleção de erros produzida pelo validator.

Corpo e query/rota usam mecanismos distintos: o
[formato JSON](../backend/shared/Admin.SharedKernel/JsonSerializerOptionsExtensions.cs) rejeita enums
numéricos; o [binder de enum](../backend/shared/Admin.SharedKernel.AspNetCore/EnumNameModelBinder.cs)
aceita exatamente um nome definido, sem distinguir caixa, e rejeita números, nomes desconhecidos ou
nomes combinados. As conversões de value objects estão descritas nas
[ADRs 0055](adr/0055-shared-string-value-objects.md) e
[0065](adr/0065-string-value-objects-in-a-query-or-route.md).

### 4.4 404 e 405 de roteamento podem não ter corpo

Uma rota sem correspondência ou um verbo não suportado pode produzir 404/405 vazio no próprio
serviço, sem passar por ApiProblemDetailsFactory. Isso difere de um recurso não encontrado pelo
handler, que segue o pipeline de Result. Outras etapas, como autenticação, também podem rejeitar
a requisição; não deduza uma sequência fixa de headers apenas pelo caminho solicitado.

A ausência de um problema reconhecível não prova que um proxy respondeu no lugar do serviço.
O consumidor deve aceitar corpos ausentes e não presumir a presença de code.

## 5. Status HTTP por ErrorType

O mapeamento está em [ResultExtensions](../backend/shared/Admin.SharedKernel.AspNetCore/ResultExtensions.cs).

| ErrorType          | Status |
| ------------------ | ------ |
| Validation         | 400    |
| NotFound           | 404    |
| Conflict           | 409    |
| Forbidden          | 403    |
| Failure e fallback | 400    |

O [handler de exceções](../backend/shared/Admin.SharedKernel.AspNetCore/GenericExceptionHandler.cs)
trata falhas inesperadas com 500 genérico e rejeições de leitura de transporte com 400/413.
Ele não substitui o tratamento de uma falha esperada por Result nem garante um corpo em toda
rejeição de roteamento.

## 6. Exemplos de distinções relevantes

- Um identificador com formato inválido pode não casar com a rota; Guid.Empty tem formato de GUID
  e pode ser recusado pelo validator como 400. O status depende de onde ocorreu a rejeição.
- Um conflito pode conter erros por campo ou uma mensagem na chave vazia. Confira o código e a
  estrutura recebida, sem deduzir o campo pelo status 409.
- Uma falha de persistência traduzida usa a mensagem genérica definida para o save. Constraints e
  detalhes internos não são uma mensagem para o usuário
  ([ADR 0048](adr/0048-database-failures-are-generic-to-the-user.md)).
- Um 500 com problema reconhecido pode conservar a mensagem do backend no frontend; um 404 vazio
  pode receber uma mensagem local genérica. A origem e o formato importam além do status.

## 7. Consumo no frontend e política de mensagens

Esta seção descreve o comportamento de
[servicesFacade.ts](../apps/admin-frontend/src/shared/api/servicesFacade.ts);
os consumidores escolhem navegação, apresentação e tentativa posterior a partir do Result.

| Resultado recebido pelo cliente                                         | Valor devolvido pela facade                                                     |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Sucesso                                                                 | ok com data do envelope, com datas revividas; 204 fica sem payload              |
| Qualquer 429                                                            | RATE_LIMIT_PROBLEM, com status 429 e mensagem local, independentemente do corpo |
| Outro non-2xx com objeto cujo title é string                            | O problema recebido, preservado                                                 |
| Outro non-2xx sem esse objeto                                           | SERVER_PROBLEM local                                                            |
| Rejeição do cliente por MissingSessionError                             | SESSION_PROBLEM local                                                           |
| Outra rejeição lançada pelo cliente, inclusive falha de leitura/parsing | NETWORK_PROBLEM local                                                           |

O guard não verifica a origem nem a completude do problema: title textual basta. Os problemas
gerados, exceto RATE_LIMIT_PROBLEM, usam status 0; o status HTTP de uma resposta não reconhecida
não é conservado em SERVER_PROBLEM. Nenhum desses valores causa redirect ou retry por si.

Mensagens de problemas preservados são exibidas pelos consumidores; isso inclui problemas 5xx.
As mensagens locais vêm da normalização acima, não de uma tradução universal por código.
Ramifique por code e status quando presentes; nunca interprete title, detail ou message como regra
de controle. traceId e correlationId servem para diagnóstico.

O [mapeamento de formulário](../apps/admin-frontend/src/shared/api/formErrors.ts) usa a primeira
entrada de cada chave quando tem mensagem, conserva código e meta e compara campos sem distinguir
caixa, convertendo guardians[0].name para guardians.0.name. Mensagens de chaves desconhecidas,
inclusive "" e command, entram no nível do formulário; o retorno contém somente a primeira mensagem
geral. title é fallback quando nenhuma mensagem de campo ou geral foi encontrada.
A [ponte React Hook Form](../apps/admin-frontend/src/shared/form/applyApiProblem.ts) aplica esses dados
aos campos e a root.serverError.

**Limite atual:** nem a facade nem esse mapper traduzem mensagens do framework ou removem a entrada
command. Elas podem chegar à interface. Alterar esse comportamento exige uma mudança própria de
produto; não crie um filtro local divergente em cada formulário.

## 8. Verificação e manutenção

O [gerador de tipos](../apps/admin-frontend/scripts/generateApiTypes.mjs) lê o OpenAPI do serviço em
execução e produz os arquivos de contrato do frontend. O
[check de drift](../apps/admin-frontend/scripts/checkGeneratedApiTypes.mjs) compara o conteúdo
gerado com o versionado; não exercita todas as operações, mensagens ou respostas vazias.

Os [testes da facade](../apps/admin-frontend/src/shared/api/servicesFacade.test.ts) e os
[testes do mapper](../apps/admin-frontend/src/shared/api/formErrors.test.ts) verificam escolhas
do consumidor. Smoke OIDC e Playwright no [workflow](../.github/workflows/frontend-ci.yml)
têm escopos próprios. Uma dessas provas não substitui as demais.

Ao mudar uma convenção, confira código, configuração e testes correspondentes e atualize a fonte
afetada. Registre execuções manuais no PR, usando dados e ambiente descartáveis; não transforme
resultados de uma exploração em catálogo permanente. O procedimento de geração e integração está
na [skill de contrato](../.claude/skills/agenza-api-contract/SKILL.md).
