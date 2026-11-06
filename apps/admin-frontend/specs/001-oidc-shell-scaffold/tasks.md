# Tarefas históricas — 001-oidc-shell-scaffold

**Status**: entrega implementada; este registro não é uma fila de retomada.
O comportamento está em [spec.md](spec.md), as escolhas em [plan.md](plan.md). A lista detalhada
original e suas anotações estão na
[versão anterior](https://github.com/evertonschuster/Agenza/blob/38d2dbd99ddb7a28aba39bf1e7434518cf78c391/apps/admin-frontend/specs/001-oidc-shell-scaffold/tasks.md).

## Entregas rastreadas

| IDs originais   | Finalidade                                                        | Evidência histórica e fonte atual                                                                                              |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| T001–T010       | Scaffold, tipos estritos, lint/formato, testes, UI e ambiente     | Scaffold e configuração integrados; versões e comandos vêm dos pins e do [README](../../README.md).                            |
| T011–T021       | Logger, geração de tipos, cliente HTTP, sessão e composição       | [PR #108](https://github.com/evertonschuster/Agenza/pull/108); refinamentos e mudanças de localização descritos no plano.      |
| T022–T029 · US1 | Guarda de rota, sessão ausente, tenant ausente e falha de conexão | `ProtectedRoute`, store de sessão e seus testes preservam a negativa de acesso.                                                |
| T030–T039 · US2 | Callback, contexto do tenant, shell e login real                  | Testes de callback/tenant e [auth.spec.ts](../../e2e/auth.spec.ts). O shell vazio foi sucedido pela spec 002.                  |
| T040–T046 · US3 | Renovação, logout e logs do ciclo de sessão                       | Transições e adaptador OIDC; a aceitação de outro tenant na renovação foi superada pela ADR 0083, não deve ser reimplementada. |
| T047–T053 · US4 | Verificação dos gates, contrato e ambiente                        | O registro original descreve execuções da época. Sua marcação não prova o estado do checkout atual nem substitui CI.           |

## Caixas abertas no registro antigo

- **T054**: corrigir o comentário do caminho gerado no workflow. O
  [workflow atual](../../../../.github/workflows/frontend-ci.yml) já aponta para `shared/api/generated/`;
  não é uma pendência de implementação.
- **T055**: executar integralmente o quickstart original. A lista antiga não registrou sua conclusão
  separadamente. Não transformar isso em instrução de repetir comandos vencidos; o
  [índice de cenários](quickstart.md) liga o aceite aos testes existentes.
- **T056**: revisão final da tabela de constituição. Não há evidência separada de conclusão naquele
  checkbox. Mudanças novas seguem a [constituição atual](../../.specify/memory/constitution.md).

A presença do código e dos commits demonstra a entrega, não que todo aceite manual tenha sido
executado. Não foram executados testes de aplicação nesta manutenção documental.
