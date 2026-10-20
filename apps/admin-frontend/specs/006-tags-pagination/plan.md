# Implementation Plan: Paginação de etiquetas

**Branch**: codex/tags-pagination | **Date**: 2026-10-20 | **Spec**: [spec.md](spec.md)

## Summary

Converter a fatia ListTags para a forma de ListClients: query paginada, filtro de Application,
validação síncrona, leitura paginada no repositório e mapeamento dos itens no handler.
O endpoint passa a retornar uma página sempre, inclusive sem parâmetros.

## Technical Context

Stack e versões: backend/global.json e backend/Directory.Packages.props.
Application usa Admin.SharedKernel; Infrastructure usa EF Core/Npgsql e RepositoryBase.
Testes: xUnit, AwesomeAssertions, NSubstitute e EF InMemory, nas versões dos pins existentes.
Armazenamento: tabela services.Tags e coluna gerada NameNormalized existentes; sem migração.

## Constitution Check

- Tenant continua vindo do token validado e dos filtros globais do contexto.
- Nenhuma dependência ou abstração compartilhada nova.
- Contrato documentado e tipos gerados pelo script existente, nunca editados à mão.
- Portões de build e testes obrigatórios; integração visual pertence ao frontend separado.
- Aspire permanece o orquestrador local.

## Phase 0 — Research

[research.md](research.md) registra os padrões encontrados e as alternativas descartadas.
Não há tecnologia nova ou questão de pesquisa em aberto.

## Phase 1 — Design

- ListTagsQuery : PagedQuery; SearchText opcional; ToFilter() produz TagListFilter.
- TagListFilter : PageRequest, com Text como string opcional.
- ListTagsQueryValidator escreve as três regras Paging.* com os limites de PageRequest.
- ITagRepository.ListAsync recebe TagListFilter e retorna PagedResult<Tag>.
- TagRepository usa ListPagedAsync, filtro literal em NameNormalized e ordem Name/Id.
- ListTagsQueryHandler usa PagedResult.Map(TagResponse.FromTag).
- TagsController anuncia ApiResponse<PagedResult<TagResponse>>.
- Testes unitários de query, validator e handler; persistência de paginação, busca e isolamento.
- Regenerar services-api.d.ts a partir do OpenAPI servido pela API final.

## Project Structure

Arquivos alterados ficam em backend/services/services-service, backend/docs/ARCHITECTURE.md,
docs/adr e apps/admin-frontend/src/shared/api/generated/services-api.d.ts.
Os artefatos desta feature ficam nesta pasta de specs.

## Integration Boundary

A tela existente e tagsRepository.list esperam Tag[]. O novo contrato exige adaptação
no PR de frontend antes do uso conjunto. Este trabalho registra o impacto sem criar uma UI
ou esconder o limite da primeira página. Não afirmar que o frontend passa sem essa adaptação.

## Validation

Executar build e test de backend/AdminBackend.slnx em Release e o gerador de tipos.
Registrar os resultados em quickstart.md. A conversão usa somente colunas e filtros existentes.
