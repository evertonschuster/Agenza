# backend — instruções para agentes

Complementa o [AGENTS.md da raiz](../AGENTS.md), que vale primeiro. Aqui só o que é específico do
backend .NET.

> Aponta, não copia ([ADR 0041](../docs/adr/0041-ai-instruction-files-reinstated.md)). Versões vêm de
> `global.json` e `Directory.Packages.props`; a forma e as regras vêm de
> [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Este arquivo não lista features, endpoints nem
> entidades — isso é o código.

## Antes de tocar no código

1. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — a forma, as regras e o porquê. **O §10 diz qual
   código copiar e qual é da geração anterior**: o arquivo mais próximo nem sempre é o exemplo certo.
2. O [índice de ADRs](../docs/adr/README.md) — abra só as ADRs vigentes da preocupação em jogo; uma
   passagem marcada como superseded é histórico, não instrução.
3. [`docs/API.md`](../docs/API.md) — as formas da fronteira HTTP: envelope, erros, status.
4. Skills: `agenza-backend-slice` para criar ou mudar uma fatia; `agenza-backend-review` para revisar
   uma mudança, inclusive a sua antes do PR; `agenza-tenant-isolation` para qualquer coisa que toque
   tenant; `agenza-api-contract` para o contrato com o frontend.

## Forma

Serviços agregados por contexto ([ADR 0001](../docs/adr/0001-context-aggregated-services.md)): uma
capacidade nova que cabe num contexto existente é uma pasta `<Feature>/<Operation>/` na Application
daquele serviço, não um serviço novo. Dentro do serviço, Clean Architecture com portas e adaptadores —
`Domain ← Application ← Infrastructure ← Api`, imposto pelas referências de projeto. As fatias
verticais organizam a Application; não substituem as camadas.

## Regras que quebram build ou review

**O Domain não referencia nada.** Nem projeto, nem pacote. `BaseEntity`, `DomainResult` e afins são
duplicados por serviço de propósito.

**Erros são valores, em cinco portões.** Validator (forma) → Domain (`DomainResult`) → handler (estado
atual: 404/409) → unit of work (`<Entity>.SaveFailed` genérico) → exceção só para o inesperado.
`try/catch` em handler é achado de review.

**Validator é síncrono e não consulta nada.** Cada regra leva `.WithErrorCode` com o código do domínio
e mensagem pt-BR; os limites vêm das constantes do domínio.

**A raiz do agregado cria os filhos.** Construtor privado, `Create` e métodos de comportamento que
devolvem `DomainResult`; filhos só pela raiz, sem `DbSet`. Valor com regra vira value object com
`Create` (valida e normaliza) e `Restore` (o que o EF chama). Transição de estado é método com nome de
intenção, nunca `SetX`. Factory é método estático no próprio tipo, nunca classe.

**Agregados se referenciam por id.** Nunca uma navegação para outra raiz; um conjunto de ids é um filho
do dono que guarda o id do outro.

**O handler é dono da orquestração.** Um por operação, sem classe base nem loader/serviço entre
handlers: regra compartilhada vai para o domínio, leitura compartilhada para o repositório. A entrada é
o próprio comando e a saída é `<Entity>Response.From<Entity>`; nenhum tipo de domínio no fio.

**Repositório simples.** Um por raiz, declarando só o que um handler chama; devolve a raiz, nunca DTO
nem `IQueryable`. Tenant e excluídos vêm dos filtros do `DbContext` — nenhum predicado manual.

**A forma mais simples correta primeiro.** Cache, projeção, SQL cru, transação aberta à mão, sequência
sem buracos: só com problema medido ou regra de produto escrita no PR.

**O tenant nunca é parâmetro.** Nenhum comando, query, DTO, mapeamento ou repositório carrega tenant: o
interceptor atribui no save e os filtros escopam a leitura. Relação entre entidades do tenant usa FK
composta `(TenantId, …)`.

**O banco é a autoridade de unicidade.** Índice único com `TenantId` e filtro `"DeletedAt" IS NULL`; a
pré-checagem do handler só existe para a resposta por campo. A Application não conhece nome de
constraint.

**Controller não tem lógica.** Liga o comando, despacha, `ToActionResult`. Todo status declarado com
`ProducesResponseType`. Enum no fio é string.

**UTC, sempre.** `TimeProvider` injetado; "hoje" é a data UTC. Nada de `DateTime.Now` nem fuso.

**Migração é aditiva.** Uma por mudança; nunca edite uma migração já commitada.

**Estilo.** Corpo em bloco com guard clauses, sem `&&`/ternário dobrado numa expressão; sem
comentário de "o quê".

## Portões

```bash
dotnet build backend/AdminBackend.slnx -c Release
dotnet test backend/AdminBackend.slnx -c Release
```

Warnings são erros, e o gate de cobertura de Domain + Application roda no `dotnet test` local igual ao
CI. Mudou o contrato de um endpoint? Regenere os tipos do frontend no mesmo PR — `npm run
generate:api-types` em `apps/admin-frontend`, com o serviço rodando; o `generate:api-types:check` do CI
compara byte a byte. Mudou algo que só o PostgreSQL garante (índice único, FK composta, `CHECK`)?
Verifique à mão num PostgreSQL descartável e registre no PR o que rodou (ARCHITECTURE §9).

## Ao terminar

- Decisão nova, ou tentada e revertida → ADR.
- Uma regra deste diretório mudou → `docs/ARCHITECTURE.md` no mesmo PR. Uma fatia nova virou a
  referência de alguma preocupação → troque a linha do §10.
- Não escreva aqui, no README nem na ARCHITECTURE lista de features, status ou "hoje só X faz Y".
