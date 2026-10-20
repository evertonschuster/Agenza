# Quickstart: Paginação de etiquetas

Na raiz do monorepo:

    dotnet build backend/AdminBackend.slnx -c Release
    dotnet test backend/AdminBackend.slnx -c Release

Para regenerar os tipos com a API final rodando:

    dotnet run --project backend/AppHost --launch-profile http
    npm run generate:api-types --workspace=apps/admin-frontend
    npm run generate:api-types:check --workspace=apps/admin-frontend

Com token e header de tenant válidos, consultar GET /api/v1/tags:

- sem query: página 1, tamanho 20;
- ?page=2&pageSize=5: página solicitada e total do catálogo;
- ?search=VIP&pageSize=2: total apenas das correspondências e no máximo dois itens;
- ?page=0, ?pageSize=101, ?page=2147483647: 400 com código Paging apropriado;
- página além do final: items vazio e total preservado.

Os testes de persistência verificam itens/contagem por tenant e soft delete, busca literal e
travessia sem repetição ou omissão. InMemory não prova collation nem SQL PostgreSQL.

## Execution results — 2026-10-20

- Build da API em Release: aprovado, zero avisos/erros.
- Build normal da solução: bloqueado no restore pelo NU1902 de MessagePack 2.5.302,
  dependência transitiva existente do AppHost, sem relação com a fatia alterada.
- Diagnóstico sem alterar pins ou configuração: restore/build com -p:NuGetAudit=false,
  seguido de dotnet build backend/AdminBackend.slnx -c Release --no-restore: aprovado,
  zero avisos/erros. Isso não remove o bloqueio do restore normal.
- dotnet test backend/AdminBackend.slnx -c Release --no-build --no-restore --logger trx:
  1.059 testes aprovados (544 do serviço, 97 de persistência, 363 do kernel,
  36 de logging e 19 de identity); todos os gates de cobertura aprovados.
  ServicesService.Application: 98,14% de linhas; Domain: 89,57%.
- OpenAPI final servido por uma API temporária em localhost:55252, com bootstrap de banco
  desativado: parâmetros Search/Page/PageSize e ApiResponseOfPagedResultOfTagResponse conferidos.
- Tipos regenerados com o gerador oficial e comparação sem drift aprovada. A porta 5080 já
  estava ocupada; na geração final, a chamada fetch da URL canônica foi encaminhada em memória
  para 55252. O gerador e o arquivo não foram editados à mão, e a origem 5080 do CI foi preservada.
- TypeScript do frontend: um TS2322 em src/features/tags/api/tagsRepository.ts:6.
  O retorno declarado ainda é ApiResult<Tag[]> e precisa consumir a página no PR de frontend.

## Self-review

Revisão pela skill agenza-backend-review: camadas, tenant, regras Paging.*, ordenação única,
no tracking, total filtrado, mapeamento e contrato conferidos. Nenhuma migração necessária.
A incompatibilidade comprovada do consumidor e o NU1902 acima impedem afirmar que todos os
portões do monorepo estão verdes ou que a entrega está pronta para merge.

Não foi realizado smoke autenticado contra PostgreSQL nem teste visual da tela. Não há índice,
FK, CHECK ou outra garantia de banco nova nesta alteração.

## CI repair validation — 2026-10-20

- MessagePack 2.5.303 is pinned centrally and referenced only by the AppHost. The normal
  audited Release build now passes without disabling NuGetAudit or warnings-as-errors.
- The full backend suite passes again: 1,059 tests and all existing coverage gates.
- The frontend TypeScript and production build pass with the collection compatibility adapter.
- The frontend suite passes: 735 tests, 82 files, with its existing coverage gates.
- ESLint passes with no errors; no rules or coverage thresholds were relaxed.
- Readability follow-up separates mapped items, query setup, tag fixture construction,
  search parsing and repository/filter setup into named local variables.
- ADR 0069 supersedes the earlier decision to leave the collection consumer incompatible.
  The existing screen still displays the complete catalog; page navigation remains deferred.
- The earlier blocked results above describe the initial run. The repair is being verified
  on the PR's new commit by the existing Backend CI, Frontend CI, API contract and CodeQL jobs.
