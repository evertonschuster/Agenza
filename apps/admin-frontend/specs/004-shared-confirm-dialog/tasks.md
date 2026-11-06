# Tarefas encerradas: diálogo de confirmação reutilizável

**Status**: registro de execução encerrada; não é uma fila de trabalho pendente.
A integração está no [PR #125, commit 84a54da3](https://github.com/evertonschuster/Agenza/pull/125).
[spec.md](spec.md) mantém o aceite original e [plan.md](plan.md) explica os desenhos substituídos.

Os IDs foram preservados para rastreabilidade. Marcas de conclusão vêm da execução histórica e da
integração do código, não de uma nova execução de testes nesta limpeza.

| ID   | Trabalho registrado                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------- |
| T001 | Baseline dos fluxos de exclusão e cobertura antes da extração.                                                        |
| T002 | Extração da classificação compartilhada de falha passageira/bloqueante.                                               |
| T003 | Casos de teste da classificação.                                                                                      |
| T004 | Componente configurável de confirmação e seus estados.                                                                |
| T005 | Migração da exclusão de Etiquetas; o adaptador com fetcher planejado foi substituído pelo envio assíncrono do widget. |
| T006 | Verificação dos fluxos existentes de exclusão após a migração.                                                        |
| T007 | Prova de configuração alternativa e isolamento de texto/estado entre instâncias.                                      |
| T008 | Verificação estática e de formatação da entrega.                                                                      |
| T009 | Verificação de cobertura real do componente.                                                                          |
| T010 | Verificação da exclusão e do bloqueio no fluxo integrado de Etiquetas.                                                |
| T011 | Registro da decisão e evolução no guia de arquitetura da época.                                                       |

## Evidências consultáveis

- [ConfirmDialog](../../src/widgets/confirm-dialog/confirm-dialog.test.tsx): configuração, envio,
  cancelamento, sucesso, falha passageira, bloqueio e instâncias distintas.
- [TagDeletePage](../../src/features/tags/ui/pages/TagDeletePage/TagDeletePage.test.tsx): integração
  da rotina, incluindo abertura, confirmação, cancelamento e bloqueio.
- [servicesFacade](../../src/shared/api/servicesFacade.test.ts): classificação de falhas.

Comandos e ambiente de validação pertencem ao [README do app](../../README.md#comandos).
Os detalhes operacionais da execução anterior permanecem no
[histórico](https://github.com/evertonschuster/Agenza/tree/38d2dbd99ddb7a28aba39bf1e7434518cf78c391/apps/admin-frontend/specs/004-shared-confirm-dialog).
