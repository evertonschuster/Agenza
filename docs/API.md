# API — convenções de request/response do backend

Este documento descreve como o `services-service` **realmente se comporta**, verificado com
requisições reais (`curl`) contra a instância local (porta 5080, via Aspire) em 2026-09-13, token de
`owner@demo.local` no tenant demo. Não é uma cópia do código — é o comportamento observado na
fronteira HTTP, com pointers para onde cada regra vive. Séries de erro por entidade (que campo,
que `code`, que mensagem) **não são catalogadas aqui**: isso muda por feature e vive no código — nos
validators, nos `DomainError` das entidades e value objects, e nos handlers de cada
`<Feature>/` ([`backend/docs/ARCHITECTURE.md`](../backend/docs/ARCHITECTURE.md) §4). O que este
documento fixa são as **formas** (envelopes, status HTTP, casing, idioma) que se repetem em qualquer
endpoint novo; os exemplos são amostras, não inventário.

Autoridade sobre isso: `Admin.SharedKernel` (`Result`, `Error`, `ErrorType`) e
`Admin.SharedKernel.AspNetCore` (`ApiResponse<T>`, `ApiProblemDetails`, `ApiProblemDetailsFactory`,
`ResultExtensions.ToActionResult`) em `backend/shared/`. Válido para qualquer serviço que reuse esse
shared kernel — hoje, `services-service`; `identity-service` também referencia o mesmo pacote.

## 1. Onde isso mora

| Peça | Valor |
| --- | --- |
| Serviço testado | `backend/services/services-service` (`ServicesService.Api`) |
| Base URL local | `http://localhost:5080` (Aspire fixa a porta em `backend/AppHost/AppHost.cs`) |
| Emissor do token | `identity-service`, `http://localhost:5081/` (OpenIddict) |
| Audience exigida | `services-api` |
| Versionamento | por segmento de URL: `/api/v{version}/...`, única versão hoje é `1.0` |
| Docs interativos (dev only) | `/api-docs` (Scalar) — `ServicesService.Api/Setup/DocumentationExtensions.cs` |

## 2. Autenticação e tenant — duas checagens, uma mensagem

Toda rota exige Bearer JWT (`FallbackPolicy` = `RequireAuthenticatedUser`) **e** um header
`X-Tenant-Id` que bata com a claim `tenant_id` do token validado (`TenantHeaderFilter`, fail-closed:
header ausente, não-GUID, ou divergente da claim — os três caem no mesmo branch). O header é
conveniência de roteamento, nunca a fronteira de segurança real ([ADR 0006](adr/0006-tenant-header-base-entity-generic-repository.md)).

**Sem token ou token inválido → 401**, corpo na forma canônica (§4.1):

```json
{"type":"https://agenza/errors/authorization","title":"Autenticação obrigatória.","status":401,"code":"Authorization.Unauthorized","traceId":"...","correlationId":"...","errors":{}}
```

**Token válido, `X-Tenant-Id` ausente OU divergente → 403**, mas com uma forma **menor** que todo
resto da API — sem `traceId`, `correlationId` nem `errors`. Isso acontece porque esse 403 específico
não passa por `ApiProblemDetailsFactory`: é montado à mão dentro de `TenantHeaderFilter`
(`Admin.Identity.Client`), que cria um `ProblemDetails` genérico e só anexa `code` via
`Extensions["code"]`:

```json
{"type":"https://agenza/errors/authorization","title":"O tenant autenticado não corresponde ao X-Tenant-Id.","status":403,"code":"Tenant.ContextMismatch"}
```

Note que o backend nunca diferencia "header ausente" de "header divergente" — mesmo código,
mesma mensagem, de propósito (não vazar qual parte da checagem falhou).

## 3. Envelope de sucesso — `ApiResponse<T>`

Toda resposta 2xx com corpo é `{ data, success: true, timestamp, traceId, correlationId }`. `data` é
o único campo que muda por endpoint.

**Lista simples** — `data` é um array (`IReadOnlyList<T>`), sem paginação. Exemplo, `GET /api/v1/tags`:

```json
{"data":[{"id":"01a09ce6-fc92-7272-8df9-e1009a6201bb","name":"Everton","color":"#0d9488","description":null}],"success":true,"timestamp":"2026-09-13T22:42:22.21Z","traceId":"...","correlationId":"..."}
```

**Lista paginada** — `data` é `PagedResult<T>`: `{ items, totalCount, page, pageSize }`, com
`page`/`pageSize` validados pelo validator da query (fora do intervalo → 400, ver §6). Exemplo,
`GET /api/v1/services`:

```json
{"data":{"items":[{"id":"...","code":1,"name":"Teste","description":null,"durationMinutes":2,"minDurationMinutes":1,"maxDurationMinutes":3,"price":10.00,"maxDiscountPercentage":10.00,"categoryId":null,"categoryName":null,"tags":[]}],"totalCount":1,"page":1,"pageSize":20},"success":true, "...":"..."}
```

**Criação** (`201 Created`, header `Location` presente, `data` é o recurso criado):

```
HTTP/1.1 201 Created
Location: /api/v1/tags/01a09cef-9875-7588-90c0-06360a4f10d0

{"data":{"id":"01a09cef-9875-7588-90c0-06360a4f10d0","name":"__doc_probe_tag__","color":"#0d9488","description":"..."},"success":true,"...":"..."}
```

**Atualização** — `200 OK`, mesma forma de `data` da criação, sem `Location`. **Delete** — `204 No
Content`, sem corpo.

Detalhes do fio que mordem quem formata para exibição:

- Números decimais chegam como número JSON puro, sem zeros à direita garantidos (`100.0`, `10`, não
  `100.00`/`10.00`) — formatação de moeda/percentual é responsabilidade de quem consome
  ([`agenza-ptbr-copy`](../.claude/skills/agenza-ptbr-copy/SKILL.md)).
- Datas de calendário são `yyyy-MM-dd`; instantes são UTC; enums são strings camelCase
  (`active`), nunca números.

## 4. Envelope de erro — três formas atrás do mesmo `application/problem+json`

O OpenAPI gerado (`services-api.d.ts`) declara **uma única forma** (`ApiProblemDetails`) para todo
400/401/403/404/409/500, em toda rota. Na prática, o mesmo status HTTP pode vir em três formas
JSON diferentes, dependendo de **qual camada** rejeitou a requisição. Quem escreve tratamento de
erro genérico (repositório, `unwrap`, formulário) precisa saber que o `code` pode não existir e que
a mensagem pode vir em inglês.

### 4.1 Forma canônica — `ApiProblemDetailsFactory` (a maioria dos casos)

Usada para: erro de validação do FluentValidation (400), falha do model binder (400, §4.3),
`NotFound`/`Conflict`/`Forbidden` de aplicação, exceção não tratada (500). Sempre `{ type, title, status, code, traceId, correlationId,
errors }`. `errors` muda de forma dependendo do tipo:

**Validação** (`ErrorType.Validation` com `FieldErrors`) — `code` é sempre `"Validation.Failed"`
(genérico; o código específico da regra vive dentro de `errors`), `errors` tem uma chave por
**campo validado da requisição**, seja do corpo, da rota ou da query, e cada chave traz uma lista de
`{code, message}`.

O `code` de cada item é o código de negócio da regra, no formato `<Tipo>.<Regra>` — o mesmo
`DomainError` que o domínio devolveria, reaproveitado pelo validator com `.WithErrorCode(...)`; por
exemplo `{"code":"ClientContact.NameRequired","message":"O nome do contato é obrigatório."}`. Validators anteriores a
essa regra ([ADR 0044](adr/0044-clients-aggregate-uniqueness-and-conflict-contract.md)) ainda expõem o
nome interno do FluentValidation (`NotEmptyValidator`, `PredicateValidator`), que não distingue uma
regra `.Must(...)` de outra — é legado, convertido quando a fatia é tocada. O exemplo verificado abaixo
é dessa forma legada:

```json
{"type":"https://agenza/errors/validation","title":"Ocorreram erros de validação.","status":400,"code":"Validation.Failed","traceId":"...","correlationId":"...","errors":{"name":[{"code":"NotEmptyValidator","message":"O nome da etiqueta é obrigatório."}],"color":[{"code":"PredicateValidator","message":"A cor da etiqueta deve ser uma das seguintes: #0d9488, #0ea5e9, #8b5cf6, #ec4899, #ef4444, #f59e0b, #22c55e, #64748b."}]}}
```

> **Casing:** as chaves de `errors` são o caminho do campo em **camelCase**, igual ao corpo JSON
> (`name`, `color`, `page`, `pageSize`, `tagId`). Itens de uma lista levam o índice na chave:
> `guardians[0].name`, `referenceContacts[1].purposes`; o erro da lista inteira vem na chave da
> lista (`guardians`). Dentro do backend os caminhos continuam com o nome da propriedade C#
> (`Guardians[0].Name`, o que o FluentValidation e os handlers produzem); a conversão acontece num
> lugar só, em `ApiProblemDetailsFactory`, ao montar a resposta
> ([ADR 0051](adr/0051-camelcase-error-keys-on-the-wire.md)).

**Validação do domínio** (`ErrorType.Validation` sem `FieldErrors`) — quando uma regra escapa do validator e
só o domínio a recusa (portão 3 da [ARCHITECTURE §4](../backend/docs/ARCHITECTURE.md)), o `DomainErrorMapper`
devolve o `DomainError` sem campo. O `title` continua o genérico de validação, o `code` do topo é o do domínio
(não `Validation.Failed`) e `errors` traz a chave vazia `""` com o mesmo `code` e a mensagem do domínio, que é o
fallback em pt-BR. O domínio não sabe qual campo nem qual índice da lista falhou, então a mensagem vai para o nível
do formulário:

```json
{"type":"https://agenza/errors/validation","title":"Ocorreram erros de validação.","status":400,"code":"FullName.Required","traceId":"...","correlationId":"...","errors":{"":[{"code":"FullName.Required","message":"O nome completo é obrigatório."}]}}
```

**Aplicação** (`NotFound`/`Conflict`/`Forbidden`, sem `FieldErrors`) — `errors` colapsa para
**uma única chave vazia** (`""`), cujo valor repete o `code`/mensagem do nível raiz. Não é um campo
de formulário: é o mesmo formato reaproveitado para carregar um erro sem campo associado.

```json
{"type":"https://agenza/errors/application","title":"Esta etiqueta está em uso por 1 serviço(s) e não pode ser excluída.","status":409,"code":"Tag.InUse","traceId":"...","correlationId":"...","errors":{"":[{"code":"Tag.InUse","message":"Esta etiqueta está em uso por 1 serviço(s) e não pode ser excluída."}]}}
```

**Conflito por campo, com `meta`** — um handler pode devolver o `Conflict` já chaveado pelo campo (em vez da
chave `""`), para o formulário mostrar a mensagem sob o input certo. Cada entrada de `errors` aceita um `meta`
opcional (mapa string→string, **omitido quando nulo**, então nenhuma resposta anterior muda) com contexto para
máquina — tipicamente o id e o nome do registro existente com que o novo colide, para a interface poder abri-lo.
Vem um conflito por resposta, numa ordem fixa definida pelo handler. No backend, `Error.Conflict(code, message,
field, meta)` (`Admin.SharedKernel`) monta o conflito já chaveado pelo campo, com o mesmo `code` e mensagem no topo e
no campo. Exemplo verificado:

```json
{"type":"https://agenza/errors/application","title":"Já existe uma pessoa cadastrada com este CPF.","status":409,"code":"Client.DuplicateCpf","traceId":"...","correlationId":"...","errors":{"cpf":[{"code":"Client.DuplicateCpf","message":"Já existe uma pessoa cadastrada com este CPF.","meta":{"clientId":"01a0fddb-c51b-732a-8aaf-d2e35115e478","clientName":"Maria Souza"}}]}}
```

### 4.2 Forma reduzida do filtro de tenant

Só `Tenant.ContextMismatch` (§2) usa essa forma menor — sem `traceId`/`correlationId`/`errors`.
Único caso hoje fora de `ApiProblemDetailsFactory`.

### 4.3 Falha do model binding — quando a requisição nem chega no dispatcher

Se o **model binder** do `[ApiController]` rejeita o corpo antes de qualquer `IValidator`/handler
rodar — uma propriedade obrigatória do record **totalmente ausente** do JSON (não vazia: ausente),
JSON malformado, um valor de tipo errado ou um value object compartilhado com formato inválido
(`CpfNumber`, [ADR 0055](adr/0055-shared-string-value-objects.md)) — a resposta usa a **forma
canônica de §4.1** (`AddModelStateProblemDetails`), não o `ValidationProblemDetails` do framework. O
que muda é o conteúdo:

- `code` é sempre `Validation.Failed`, no topo e em cada item de `errors`: o binder não conhece a
  regra de negócio que falhou;
- a chave de `errors` é o campo em camelCase (`fullName`, `guardians[0].cpf`); uma falha que não é de
  um campo — JSON malformado, corpo vazio — vem sob a chave vazia `""`;
- a `message` é o texto do framework, **em inglês** ("The FullName field is required.", "A non-empty
  request body is required."), exceto a de um value object compartilhado, que vem em pt-BR ("O CPF
  informado é inválido.") e nunca ecoa o valor recebido. Um valor de tipo errado traz o texto do
  `System.Text.Json` — nome interno do tipo e posição do parser, não texto para o usuário;
- só a **primeira** falha de valor é reportada: o `System.Text.Json` para no primeiro valor inválido,
  então dois CPFs inválidos no mesmo corpo geram uma única entrada;
- uma falha de **leitura do corpo** (JSON malformado, corpo vazio, tipo errado, value object inválido)
  vem com uma segunda chave em `errors`: o nome do parâmetro do corpo na action (`command` nos
  controllers de hoje) com "The command field is required.". O framework marca o parâmetro inteiro
  como ausente, a entrada só repete a falha real, e o backend não a remove. Uma propriedade ausente
  (`fullName`) não a produz.

Verificado em 2026-10-06 num host descartável com os mesmos controllers e a mesma configuração de MVC
e de OpenAPI do serviço, sem banco nem autenticação:

```json
{"type":"https://agenza/errors/validation","title":"Ocorreram erros de validação.","status":400,"code":"Validation.Failed","traceId":"...","correlationId":"...","errors":{"fullName":[{"code":"Validation.Failed","message":"The FullName field is required."}]}}
{"type":"https://agenza/errors/validation","title":"Ocorreram erros de validação.","status":400,"code":"Validation.Failed","traceId":"...","correlationId":"...","errors":{"":[{"code":"Validation.Failed","message":"Expected depth to be zero at the end of the JSON payload. ... Path: $ | LineNumber: 0 | BytePositionInLine: 19."}],"command":[{"code":"Validation.Failed","message":"The command field is required."}]}}
{"type":"https://agenza/errors/validation","title":"Ocorreram erros de validação.","status":400,"code":"Validation.Failed","traceId":"...","correlationId":"...","errors":{"cpf":[{"code":"Validation.Failed","message":"O CPF informado é inválido."}],"command":[{"code":"Validation.Failed","message":"The command field is required."}]}}
```

### 4.4 404 e 405 vazios de roteamento — sem corpo, sem Content-Type

Quando **nenhuma rota casa** — `{id:guid}` recebendo algo que não é GUID, uma versão de API que
nenhum controller declara (`/api/v2/tags` → 404, não um erro de versionamento; hoje só existe
`1.0`), ou um path inexistente — a resposta é um 404 do middleware de roteamento do ASP.NET,
**antes** de qualquer filtro/controller/`ApiProblemDetailsFactory` rodar: `Content-Length: 0`, sem
`Content-Type`, corpo vazio. O mesmo vale pra 405 (verbo não suportado numa rota que existe), que
soma o header `Allow` com os verbos aceitos:

```
HTTP/1.1 404 Not Found
Content-Length: 0
```

```
HTTP/1.1 405 Method Not Allowed
Content-Length: 0
Allow: GET, POST
```

Ou seja: **um 404 pode vir com corpo JSON rico (§4.1, recurso não encontrado) ou completamente
vazio (rota não casou)** — o status sozinho não diz qual. Só dá pra diferenciar checando se o corpo
existe.

## 5. Status HTTP por `ErrorType` (`Admin.SharedKernel.AspNetCore.ResultExtensions`)

| `ErrorType` | Status | Quando |
| --- | --- | --- |
| `Validation` | 400 | FluentValidation falhou (comando ou query) |
| `NotFound` | 404 | Handler não achou o recurso pelo id |
| `Conflict` | 409 | Regra de negócio checada pelo handler (duplicado, recurso em uso), ou falha ao salvar rejeitada pelo banco — esta última sempre genérica, `<Entity>.SaveFailed`, sem campo ([ADR 0048](adr/0048-database-failures-are-generic-to-the-user.md)) |
| `Forbidden` | 403 | Erro de aplicação do tipo Forbidden (raro; não confundir com o 403 de tenant, §4.2) |
| `Failure` | 400 | Fallback genérico |
| corpo recusado pelo servidor | 413 / 400 | `GenericExceptionHandler`, forma canônica: `Request.TooLarge` acima do `[RequestSizeLimit]` do endpoint, `Request.Invalid` para corpo truncado ou malformado no transporte |
| exceção não tratada | 500 | `GenericExceptionHandler`, forma canônica, mensagem sempre genérica (não vaza detalhe da exceção) |

## 6. Exemplos verificados (amostra, não catálogo)

Cada linha ilustra uma **categoria** de resposta que se repete em qualquer feature; a rota é só onde
ela foi observada. Rodado ao vivo contra a instância local (2026-09-13) e contra um PostgreSQL
descartável (2026-10-02; chaves de `errors` revistas em 2026-10-04), com os dados de teste removidos ao final.

| Cenário | Verbo + rota | Status | `code` |
| --- | --- | --- | --- |
| Nome duplicado | `POST /api/v1/tags` (nome já existe) | 409 | `Tag.DuplicateName` |
| Recurso não encontrado | `PUT`/`DELETE /api/v1/tags/{id}` (id não existe) | 404 | `Tag.NotFound` |
| Recurso em uso (regra cruzando entidades) | `DELETE /api/v1/tags/{id}` (tag usada por um `service`) | 409 | `Tag.InUse` |
| Categoria não encontrada | `GET /api/v1/categories/{id}` (id não existe) | 404 | `Category.NotFound` |
| Id vazio ≠ id inexistente | `DELETE /api/v1/tags/00000000-0000-0000-0000-000000000000` | 400 (não 404!) | `Validation.Failed` (`tagId`: `NotEmptyValidator`) |
| Paginação fora do intervalo | `GET /api/v1/services?page=0` | 400 | `Validation.Failed` (`page`: `GreaterThanOrEqualValidator`) |
| Paginação fora do intervalo | `GET /api/v1/services?pageSize=1000` | 400 | `Validation.Failed` (`pageSize`: `InclusiveBetweenValidator`) |
| CPF já cadastrado (pessoa ativa ou inativa) | `POST /api/v1/clients` | 409 | `Client.DuplicateCpf` (`errors.cpf[0].meta.clientId`) |
| E-mail de pessoa ativa repetido (qualquer caixa) | `POST /api/v1/clients` | 409 | `Client.DuplicateEmail` (`errors.email[0].meta.clientId`) |
| Menor sem responsável | `POST /api/v1/clients` (`birthDate` de menor, `guardians: []`) | 400 | `Validation.Failed` (`guardians`: `Client.GuardianRequired`) |
| Campos de contato inválidos | `POST /api/v1/clients` | 400 | `Validation.Failed` (`guardians[0].name`: `ClientContact.NameRequired`, `referenceContacts[0].purposes`: `ContactPurposes.Required`…) |
| CPF inválido, em qualquer formatação (§4.3) | `POST /api/v1/clients` (`cpf` ou `guardians[0].cpf`) | 400 | `Validation.Failed` (`cpf`: `Validation.Failed`, "O CPF informado é inválido.") |
| `fullName` ausente do JSON | `POST /api/v1/clients` | 400 (§4.3: mensagem do framework, em inglês) | `Validation.Failed` (`fullName`: `Validation.Failed`) |

O detalhe do meio da tabela (`00000000-...-0000`) é a pegadinha mais fácil de esquecer: a
constraint de rota `{id:guid}` só valida **formato**, então um GUID zerado passa pelo roteamento
normalmente e só é rejeitado dentro do `DeleteTagCommandValidator` (`NotEmpty`) — chega como 400 de
validação, não 404 de "não encontrado", mesmo parecendo semanticamente "não existe".

Os `code`s de uma feature vivem no código dela: os validators e os `DomainError` declarados nas
entidades e value objects (regras de forma), e os handlers (regras de estado), sob
`backend/services/<service>/<Service>.Application/<Feature>/` e `<Service>.Domain/`.

## 7. Para quem consome isto (frontend e futuros agentes)

- **Ramifique por `code`, nunca por `title`/mensagem livre** — já é regra do
  [AGENTS.md raiz](../AGENTS.md) e da skill [`agenza-api-contract`](../.claude/skills/agenza-api-contract/SKILL.md); §4.4 é o motivo concreto: o `code` pode
  simplesmente não existir.
- **Ignore a chave de `errors` que é o nome do parâmetro do corpo** (`command`, §4.3): numa falha de
  leitura do corpo ela repete a falha real e não é um campo da requisição. Um consumidor que trata
  toda chave desconhecida como erro de formulário a mostra como "The command field is required.".
- Trate **ausência de `code`** como um caso válido (fallback genérico), não como bug — acontece nos
  404/405 sem corpo (§4.4). O `code` de uma falha de binding existe, mas é sempre `Validation.Failed`:
  não distingue a regra (§4.3).
- **Não confie em `Content-Type` nem em corpo presente** para 404/405 — podem vir vazios (§4.4).
- **Mostre a mensagem que veio na forma canônica (§4.1)** — `title` e cada `errors[campo][i].message`
  são texto pt-BR escrito para o usuário final; exiba como chegou, sem reescrever. Texto próprio do
  frontend só onde não há mensagem do backend utilizável: o texto de binding do framework (§4.3), que
  sai em inglês, os 404/405 vazios (§4.4) e falhas de rede.
- O contrato gerado (`shared/api/generated/services-api.d.ts`) promete `ApiProblemDetails` para
  todo erro — a forma §4.2 e os 404/405 vazios (§4.4) divergem desse contrato na prática. Isso é o comportamento real
  do serviço hoje, não necessariamente um bug a corrigir; só não dá pra assumir a forma rica em
  100% dos casos.

## 8. Como reproduzir

Backend local rodando (via Aspire, `dotnet run --project backend/AppHost` ou equivalente), token
Bearer de um usuário autenticado (`identity-service`, audience `services-api`) e o `tenant_id` da
claim desse token como `X-Tenant-Id`:

```bash
curl -i http://localhost:5080/api/v1/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-Id: $TENANT_ID"
```

Trocar verbo/rota/corpo para explorar os outros cenários desta página. Qualquer recurso criado
durante exploração manual deve ser removido (`DELETE`) ao final — o tenant demo é compartilhado
com login semeado do Playwright ([`agenza-testing`](../.claude/skills/agenza-testing/SKILL.md)).
