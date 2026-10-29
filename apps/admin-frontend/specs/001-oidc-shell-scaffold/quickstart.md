# Índice histórico de cenários — 001-oidc-shell-scaffold

Os nomes em [e2e/auth.spec.ts](../../e2e/auth.spec.ts) citam os números deste antigo quickstart.
Este arquivo conserva esse vínculo; preparação, comandos e credenciais locais pertencem ao
[README](../../README.md), e os gates a [QUALITY](../../../../docs/QUALITY.md).

| Cenário original                    | Aceite da spec                      | Verificação correspondente                                                                                                                                         |
| ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1 — visitante sem sessão            | US1 · FR-001/FR-002 · SC-002        | Teste de redirect ao login sem exibição de conteúdo protegido.                                                                                                     |
| 2 — login real e tenant             | US2 · FR-003/FR-004/FR-005 · SC-003 | Teste de login no identity-service e retorno ao shell, com tenant extraído do token.                                                                               |
| 3 — continuidade da sessão e logout | US3 · FR-007/FR-008 · SC-004        | O e2e atual verifica persistência após reload e logout; transições de renovação têm testes de unidade. O nome legado não comprova espera pelo vencimento do token. |
| 4 — ferramentas                     | US4 · FR-011/FR-012 · SC-005        | Scripts do app e workflow; não repetir aqui uma lista de comandos ou limiares.                                                                                     |
| 5 — suíte e2e                       | Histórias de autenticação           | Playwright contra o stack Aspire real, sem substituir OIDC por mock.                                                                                               |
| 6 — drift do contrato               | Geração e consumo OpenAPI           | Checagem definida pelo gerador e pelo workflow atual.                                                                                                              |

A descrição original dos passos está no
[Git](https://github.com/evertonschuster/Agenza/blob/38d2dbd99ddb7a28aba39bf1e7434518cf78c391/apps/admin-frontend/specs/001-oidc-shell-scaffold/quickstart.md).
Este índice não registra uma nova execução nem declara os cenários aprovados no checkout atual.
