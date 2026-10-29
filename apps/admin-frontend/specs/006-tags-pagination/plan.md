# Plano histórico: paginação de etiquetas

**Status**: backend e compatibilidade inicial integrados no
[PR #180](https://github.com/evertonschuster/Agenza/pull/180).
[spec.md](spec.md) mantém os requisitos; [tasks.md](tasks.md) registra o encerramento.

## Escolhas de implementação e razões

- Aplicar o contrato compartilhado já usado por clientes: `PagedQuery`, `PageRequest`, `PagedResult`
  e `RepositoryBase.ListPagedAsync`. Offset/count manuais, tupla própria e modo opcional sem paginação
  foram descartados por duplicarem o padrão ou contrariarem a escolha de paginar sempre.
- Converter a busca tocada para `SearchText` e `Contains` na coluna existente `NameNormalized`.
  Isso reutiliza normalização/limite de entrada e trata `%`/`_` literalmente, sem wildcard implícito
  de `ILike`; não exige alteração de schema.
- Preservar a ordem por `Name` e acrescentar `Id` como desempate único. Mudar a ordem para
  `NameNormalized` ou introduzir índice sem evidência não era necessário para a paginação.
- Receber filtro na porta, aplicar filtros globais de tenant/soft delete à contagem e aos itens e
  mapear a página para `TagResponse` no handler. A leitura não pode produzir gravações.
- Regenerar os tipos OpenAPI no rollout do backend. A proposta inicial deixava a adaptação do
  consumidor para um PR frontend; a falha de compilação demonstrou que essa separação deixava o
  contrato sem integração independente. A correção foi registrada na ADR 0069.

A decisão backend está na
[ADR 0068](../../../../docs/adr/0068-tags-paginated-list.md), com limites do contrato e dos testes de
persistência. Implementação consultável:
[ListTags](../../../../backend/services/services-service/ServicesService.Application/Tags/ListTags),
[TagRepository](../../../../backend/services/services-service/ServicesService.Infrastructure/Repositories/TagRepository.cs)
e [PageRequest](../../../../backend/shared/Admin.SharedKernel/PageRequest.cs).

## Evolução do consumidor

1. **Rollout, PR #180 / ADR 0069:** `tagsRepository.list` preservou temporariamente o retorno de
   coleção, consultando páginas limitadas em sequência. Mantinha ordem, busca e cancelamento;
   uma falha descartava o acumulado parcial. Entregar só a primeira página silenciosamente, um cast
   ou uma supressão de tipo não preservaria o catálogo existente.
2. **Paginação explícita, [PR #184, commit a3c1f47e](https://github.com/evertonschuster/Agenza/pull/184):**
   a [ADR 0074](../../../../docs/adr/0074-admin-frontend-tags-list-asks-only-when-told.md) retirou esse
   adaptador. O repositório passou a devolver uma página por chamada; a tela adotou o widget de
   paginação e buscas disparadas por ações, montagem ou correção da página além do fim.
3. **Estado na URL, [PR #190, commit fa07d965](https://github.com/evertonschuster/Agenza/pull/190):**
   filtros aplicados, página e tamanho voltaram à URL por estado controlado da página. Isso substitui
   a etapa sem URL descrita no corpo histórico da ADR 0074; não reintroduz fetch por efeito da query.

Para modificar o frontend, consulte o
[guia vigente](../../docs/ARCHITECTURE.md#1-shape),
[tagsRepository](../../src/features/tags/api/tagsRepository.ts) e
[useTagListPage](../../src/features/tags/ui/pages/TagListPage/useTagListPage.ts).
Este plano não recomenda restaurar o adaptador nem a versão histórica sem estado na URL.

## Alcance da validação

A entrega registrou testes de query, validator, handler e persistência, além da geração OpenAPI e
checagens de compilação do consumidor. Os testes de persistência com InMemory não provam collation
nem tradução SQL PostgreSQL; não houve smoke autenticado PostgreSQL registrado naquela execução.
Resultados transitórios de restore, pins de correção, contagens e comandos ficam no PR e no
[snapshot anterior dos artefatos](https://github.com/evertonschuster/Agenza/tree/38d2dbd99ddb7a28aba39bf1e7434518cf78c391/apps/admin-frontend/specs/006-tags-pagination).
Este registro não declara aprovação de uma execução atual dos gates.
