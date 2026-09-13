# API — convenções de request/response do backend

Este documento descreve como o `services-service` **realmente se comporta**, verificado com
requisições reais (`curl`) contra a instância local (porta 5080, via Aspire) em 2026-09-13, token de
`owner@demo.local` no tenant demo. Não é uma cópia do código — é o comportamento observado na
fronteira HTTP, com pointers para onde cada regra vive. Séries de erro por entidade (que campo,
que `code`, que mensagem) **não são catalogadas aqui**: isso muda por feature e vive em
`backend/services/*/​*.Application/**/*Validator.cs` e `*ErrorMapper.cs`. O que este documento fixa
são as **formas** (envelopes, status HTTP, casing, idioma) que se repetem em qualquer endpoint novo.

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

**Lista simples** (`GET /api/v1/tags`, `GET /api/v1/categories` — sem paginação, sem limite):

```json
{"data":[{"id":"01a09ce6-fc92-7272-8df9-e1009a6201bb","name":"Everton","color":"#0d9488","description":null}],"success":true,"timestamp":"2026-09-13T22:42:22.21Z","traceId":"...","correlationId":"..."}
```

**Lista paginada** (`GET /api/v1/services` — o único endpoint hoje que pagina; `page`/`pageSize`
validados por `ListServicesQueryValidator`, ver §6):

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

Dois detalhes que mordem quem formata para exibição:

- Números decimais (`price`, `maxDiscountPercentage`) chegam como número JSON puro, sem zeros à
  direita garantidos (`100.0`, `10`, não `100.00`/`10.00`) — formatação de moeda/percentual é
  responsabilidade de quem consome ([`agenza-ptbr-copy`](../.claude/skills/agenza-ptbr-copy/SKILL.md)).
- `services` embute o nome da categoria (`categoryName`) e um resumo de cada tag (`id`, `name`,
  `color`) diretamente no payload — não é preciso buscar categoria/tag à parte para exibir uma
  linha de serviço.

## 4. Envelope de erro — quatro formas atrás do mesmo `application/problem+json`

O OpenAPI gerado (`services-api.d.ts`) declara **uma única forma** (`ApiProblemDetails`) para todo
400/401/403/404/409/500, em toda rota. Na prática, o mesmo status HTTP pode vir em quatro formas
JSON diferentes, dependendo de **qual camada** rejeitou a requisição. Quem escreve tratamento de
erro genérico (repositório, `unwrap`, formulário) precisa saber que o `code` pode não existir e que
a mensagem pode vir em inglês.

### 4.1 Forma canônica — `ApiProblemDetailsFactory` (a maioria dos casos)

Usada para: erro de validação do FluentValidation (400), `NotFound`/`Conflict`/`Forbidden` de
aplicação, exceção não tratada (500). Sempre `{ type, title, status, code, traceId, correlationId,
errors }`. `errors` muda de forma dependendo do tipo:

**Validação** (`ErrorType.Validation` com `FieldErrors`) — `code` é sempre `"Validation.Failed"`
(genérico; o código específico da regra vive dentro de `errors`), `errors` tem uma chave por
**propriedade C#**, cada uma uma lista de `{code, message}`:

```json
{"type":"https://agenza/errors/validation","title":"Ocorreram erros de validação.","status":400,"code":"Validation.Failed","traceId":"...","correlationId":"...","errors":{"Name":[{"code":"NotEmptyValidator","message":"O nome da etiqueta é obrigatório."}],"Color":[{"code":"PredicateValidator","message":"A cor da etiqueta deve ser uma das seguintes: #0d9488, #0ea5e9, #8b5cf6, #ec4899, #ef4444, #f59e0b, #22c55e, #64748b."}]}}
```

> **Casing:** as chaves de `errors` são o nome da propriedade do record C# (`Name`, `Color`,
> `Page`, `PageSize`, `TagId`) — **PascalCase**, mesmo que o corpo da requisição tenha sido enviado
> em camelCase. Não há conversão automática; quem mapeia erro→campo de formulário mapeia por esse
> nome exato.

**Aplicação** (`NotFound`/`Conflict`/`Forbidden`, sem `FieldErrors`) — `errors` colapsa para
**uma única chave vazia** (`""`), cujo valor repete o `code`/mensagem do nível raiz. Não é um campo
de formulário: é o mesmo formato reaproveitado para carregar um erro sem campo associado.

```json
{"type":"https://agenza/errors/application","title":"Esta etiqueta está em uso por 1 serviço(s) e não pode ser excluída.","status":409,"code":"Tag.InUse","traceId":"...","correlationId":"...","errors":{"":[{"code":"Tag.InUse","message":"Esta etiqueta está em uso por 1 serviço(s) e não pode ser excluída."}]}}
```

### 4.2 Forma reduzida do filtro de tenant

Só `Tenant.ContextMismatch` (§2) usa essa forma menor — sem `traceId`/`correlationId`/`errors`.
Único caso hoje fora de `ApiProblemDetailsFactory`.

### 4.3 Forma nativa do ASP.NET Core — quando a requisição nem chega no dispatcher

Se o **model binder** do `[ApiController]` rejeita o corpo antes de qualquer `IValidator`/handler
rodar — uma propriedade obrigatória do record **totalmente ausente** do JSON (não vazia: ausente), ou
JSON malformado — a resposta é o `ValidationProblemDetails` padrão do framework, não
`ApiProblemDetails`. Três diferenças que quebram tratamento genérico escrito só olhando §4.1:

- **sem `code`** — nada para ramificar;
- `errors` é `Record<string, string[]>` — array de string, não de `{code, message}`;
- `type` aponta pra RFC 9110 genérica, e a mensagem **vem em inglês** ("The Name field is
  required.", "One or more validation errors occurred.") — quebra a regra de copy pt-BR se
  exibida crua.

```json
{"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"One or more validation errors occurred.","status":400,"errors":{"Name":["The Name field is required."],"Color":["The Color field is required."]},"traceId":"00-fd8ab30c0d7ca41b18f942bf5914a674-b4b4a1861d1c7b50-01"}
```

JSON malformado soma um segundo sintoma: a chave `"$"` com o erro de parsing do
`System.Text.Json`, mais um `"command"` reclamando que o parâmetro inteiro da action é obrigatório
(o model binder falha para a action inteira, não só para um campo):

```json
{"errors":{"$":["Expected depth to be zero at the end of the JSON payload. ..."],"command":["The command field is required."]},"traceId":"00-b513cf5e...-01"}
```

`traceId` aqui também é outro formato (W3C traceparent, `00-<trace>-<span>-01`), diferente do
`{TraceIdentifier}:{contador}` usado em toda outra resposta.

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
| `Conflict` | 409 | Regra de negócio (nome duplicado, recurso em uso, violação de índice único) |
| `Forbidden` | 403 | Erro de aplicação do tipo Forbidden (raro; não confundir com o 403 de tenant, §4.2) |
| `Failure` | 400 | Fallback genérico |
| exceção não tratada | 500 | `GenericExceptionHandler`, forma canônica, mensagem sempre genérica (não vaza detalhe da exceção) |

## 6. Exemplos verificados (amostra, não catálogo)

Rodado ao vivo em 2026-09-13 contra tags/categories/services; todos os dados de teste criados
(`__doc_probe_*`) foram removidos ao final via `DELETE`.

| Cenário | Verbo + rota | Status | `code` |
| --- | --- | --- | --- |
| Nome duplicado | `POST /api/v1/tags` (nome já existe) | 409 | `Tag.DuplicateName` |
| Recurso não encontrado | `PUT`/`DELETE /api/v1/tags/{id}` (id não existe) | 404 | `Tag.NotFound` |
| Recurso em uso (regra cruzando entidades) | `DELETE /api/v1/tags/{id}` (tag usada por um `service`) | 409 | `Tag.InUse` |
| Categoria não encontrada | `GET /api/v1/categories/{id}` (id não existe) | 404 | `Category.NotFound` |
| Id vazio ≠ id inexistente | `DELETE /api/v1/tags/00000000-0000-0000-0000-000000000000` | 400 (não 404!) | `Validation.Failed` (`TagId`: `NotEmptyValidator`) |
| Paginação fora do intervalo | `GET /api/v1/services?page=0` | 400 | `Validation.Failed` (`Page`: `GreaterThanOrEqualValidator`) |
| Paginação fora do intervalo | `GET /api/v1/services?pageSize=1000` | 400 | `Validation.Failed` (`PageSize`: `InclusiveBetweenValidator`) |

O detalhe do meio da tabela (`00000000-...-0000`) é a pegadinha mais fácil de esquecer: a
constraint de rota `{id:guid}` só valida **formato**, então um GUID zerado passa pelo roteamento
normalmente e só é rejeitado dentro do `DeleteTagCommandValidator` (`NotEmpty`) — chega como 400 de
validação, não 404 de "não encontrado", mesmo parecendo semanticamente "não existe".

Catálogo completo de `code`s por entidade: `*CommandValidator.cs` (mensagens de forma/formato) e
`*ErrorMapper.cs`/handlers (regras de negócio) sob
`backend/services/services-service/ServicesService.Application/{Tags,Categories,Services}/`.

## 7. Para quem consome isto (frontend e futuros agentes)

- **Ramifique por `code`, nunca por `title`/mensagem livre** — já é regra do
  [AGENTS.md raiz](../AGENTS.md) e da skill [`agenza-api-contract`](../.claude/skills/agenza-api-contract/SKILL.md); §4.3 é o motivo concreto: `code` pode
  simplesmente não existir.
- Trate **ausência de `code`** como um caso válido (fallback genérico), não como bug — acontece
  sempre que um campo obrigatório falta inteiramente no corpo, ou o JSON é inválido.
- **Não confie em `Content-Type` nem em corpo presente** para 404/405 — podem vir vazios (§4.4).
- Se algum dia esta API expuser mensagem nativa do framework (§4.3) direto na UI, ela sai em
  inglês — quebra a regra de copy pt-BR. Prefira sempre um texto próprio por `code` conhecido, com
  fallback genérico pt-BR quando `code` está ausente.
- O contrato gerado (`shared/api/generated/services-api.d.ts`) promete `ApiProblemDetails` para
  todo erro — as formas §4.2 e §4.3 divergem desse contrato na prática. Isso é o comportamento real
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
