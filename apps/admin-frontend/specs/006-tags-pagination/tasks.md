# Tarefas encerradas: paginação de etiquetas

**Status**: registro histórico integrado no
[PR #180, commit fcfe2210](https://github.com/evertonschuster/Agenza/pull/180); nenhuma tarefa abaixo
representa trabalho pendente. [spec.md](spec.md) preserva o aceite e [plan.md](plan.md) a evolução.
Os IDs e a conclusão histórica foram preservados, sem repetir diário de execução ou comandos atuais.

| ID   | Trabalho registrado                                                            |
| ---- | ------------------------------------------------------------------------------ |
| T001 | Comparação de ListClients, ListTags e decisões aplicáveis.                     |
| T002 | Especificação, plano e auxiliares de desenho, agora consolidados em spec/plan. |
| T003 | Filtro paginado de etiquetas e query.                                          |
| T004 | Regras de validação `Paging.*`.                                                |
| T005 | Porta paginada e handler de mapeamento.                                        |
| T006 | Repositório e anúncio do contrato no controller.                               |
| T007 | Testes de query, validator e handler.                                          |
| T008 | Busca com `SearchText`, `NameNormalized` e semântica literal.                  |
| T009 | Testes de paginação, busca e isolamento na persistência.                       |
| T010 | ADR 0068 e índice.                                                             |
| T011 | Atualização da referência de repositório no guia backend.                      |
| T012 | Tipos OpenAPI regenerados a partir da API final.                               |
| T013 | Verificação de backend e geração sem drift na entrega.                         |
| T014 | Revisão backend e registro dos resultados no PR.                               |
| T015 | Separação de mapeamento, preparação de query e fixtures em variáveis locais.   |
| T016 | Pin corrigido de MessagePack no AppHost para restabelecer o restore auditado.  |
| T017 | Adaptador temporário de coleção e testes de travessia/falha.                   |
| T018 | ADR 0069 e correção da fronteira de integração.                                |
| T019 | Verificação local e publicação para os checks do PR.                           |

## Evidências consultáveis

- [ListTags](../../../../backend/services/services-service/ServicesService.Tests/Tags/ListTags):
  filtro, validação, mapeamento e metadados.
- [TagListPersistenceTests](../../../../backend/services/services-service/ServicesService.PersistenceTests/TagListPersistenceTests.cs):
  contagem filtrada, busca literal, travessia e isolamento com os limites descritos no plano.
- [Histórico do rollout](https://github.com/evertonschuster/Agenza/commit/fcfe2210): inclui a geração
  de tipos e o adaptador de compatibilidade; o adaptador foi retirado no PR #184, não está pendente.

Nenhum teste de aplicação foi executado novamente nesta consolidação documental. Os comandos de
validação pertencem aos guias [backend](../../../../backend/README.md) e [frontend](../../README.md).
