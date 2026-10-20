# Tasks: Paginação de etiquetas

## Phase 1 — Setup

- [x] T001 Analisar ListClients, ListTags, ARCHITECTURE e ADRs aplicáveis.
- [x] T002 Registrar spec.md, plan.md, research.md, data-model.md e contracts/tags-list.md.

## Phase 2 — US1: Consultar páginas

- [x] T003 [US1] Adicionar Tags/TagListFilter.cs e mudar Tags/ListTags/ListTagsQuery.cs.
- [x] T004 [US1] Adicionar Tags/ListTags/ListTagsQueryValidator.cs com as regras Paging.*.
- [x] T005 [US1] Alterar Abstractions/ITagRepository.cs e Tags/ListTags/ListTagsQueryHandler.cs.
- [x] T006 [US1] Alterar Infrastructure/Repositories/TagRepository.cs e Api/Controllers/TagsController.cs.
- [x] T007 [US1] Cobrir query, validator e handler em ServicesService.Tests/Tags/ListTags.

## Phase 3 — US2: Busca com paginação e isolamento

- [x] T008 [US2] Usar SearchText, NameNormalized e busca literal na fatia ListTags.
- [x] T009 [US2] Adicionar ServicesService.PersistenceTests/TagListPersistenceTests.cs.

## Phase 4 — Contract and verification

- [x] T010 Registrar docs/adr/0068-tags-paginated-list.md e atualizar docs/adr/README.md.
- [x] T011 Atualizar backend/docs/ARCHITECTURE.md §10 para retirar a referência antiga de TagRepository.
- [x] T012 Regenerar apps/admin-frontend/src/shared/api/generated/services-api.d.ts pela API final.
- [x] T013 Executar os portões do backend e conferir geração sem drift.
- [x] T014 Revisar o diff com agenza-backend-review e registrar resultados em quickstart.md.

## Dependencies and strategy

T001–T002 precedem US1; T003–T006 estabelecem o contrato antes dos testes e do gerador.
US2 depende do filtro de US1. T010–T014 concluem a entrega.
Testes de Application e persistência são independentes após os contratos estarem definidos;
a implementação desta execução será sequencial.

## CI repair and readability follow-up

- [x] T015 Separate mapping, query setup and test fixture construction into named local variables.
- [x] T016 Pin corrected MessagePack in backend/Directory.Packages.props and backend/AppHost/AppHost.csproj.
- [x] T017 Adapt tagsRepository.list to collect bounded pages and test collection completeness and failures.
- [x] T018 Record ADR 0069 and update the superseded compatibility decision and architecture reference.
- [x] T019 Complete local gates; publish the fixes and verify the final PR checks in GitHub.
