# Tarefas históricas — 002-ui-foundation

**Status**: implementação integrada; não retomar a primeira caixa desmarcada como trabalho atual.
O comportamento e o aceite estão em [spec.md](spec.md); escolhas e restrições em [plan.md](plan.md).
O diário original, com cada alteração e resultado de execução, permanece no
[Git](https://github.com/evertonschuster/Agenza/blob/38d2dbd99ddb7a28aba39bf1e7434518cf78c391/apps/admin-frontend/specs/002-ui-foundation/tasks.md).

## Entregas rastreadas

| IDs originais   | Entrega histórica                                       | Situação                                                                                                                       |
| --------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| T001–T006       | Arquivos de instrução, skills, ambiente e ADR 0041      | Trabalho de preparação, fora do comportamento visual. A política documental evoluiu depois; não restaurar instalações antigas. |
| T010–T021       | Tokens, contraste, tipografia e movimento               | Entregues na fundação, com os limites de T017/T018 abaixo. Valores atuais pertencem ao CSS.                                    |
| T030–T043 · US1 | Tema de três estados, bootstrap e handoff de login      | Código e testes no [PR #117](https://github.com/evertonschuster/Agenza/pull/117); decisão na ADR 0040.                         |
| T050–T061       | Primitivos e ajuste de configuração                     | Entrega Base UI; exclusões, comandos e lockfile daquele momento não são instruções atuais.                                     |
| T070–T083 · US2 | Shell responsivo, navegação e remoção do shell anterior | Componentes e testes de shell; a revisão corrigiu overflow do header e o alvo do reset de rolagem.                             |
| T090–T094 · US5 | Rotas e explicações dos destinos indisponíveis          | Entrega inicial; capacidades de negócio posteriores substituíram parte dos placeholders.                                       |
| T105 · US4      | Paleta de comandos                                      | Mantida; atalhos personalizados foram removidos no [PR #143](https://github.com/evertonschuster/Agenza/pull/143).              |
| T130–T133       | Documentação, ADRs e constituição                       | Registro no [PR #116](https://github.com/evertonschuster/Agenza/pull/116); fontes atuais são os guias e ADRs correspondentes.  |
| T140–T166       | Revisões de layout, foco, tema e aceite                 | Correções e decisões estão consolidadas no plano. A antiga marcação não comprova o estado atual.                               |

## Como interpretar as antigas pendências

- **T017**: a técnica visual de tags existia, mas não havia consumidor com dado real na fundação.
  Foi adiada naquele recorte; não criar uma tela falsa nem afirmar ausência de consumidor hoje.
- **T018**: os tokens propostos para densidade touch não eram usados e foram retirados. Não havia
  garantia global entregue; conferir cada controle, preservando o aceite de navegação da spec.
- **T154**: triagem de alegações de revisão. As dúvidas sobre cores de overlay e um `research.md`
  inexistente foram tratadas em T165/T162. A pesquisa nunca commitada não pode ser reconstruída
  como evidência nem virar um arquivo novo nesta limpeza.
- **T155**: escolha de coerência do `theme-color` entre origens, não defeito funcional confirmado.
  O checkbox não registrou uma conclusão própria. A implementação e a ADR 0040 são a fonte para
  investigar uma mudança; não alterar cores somente para encerrar o item antigo.
- **T160/T166**: perguntas sobre scaffolds sem consumidor pertenciam àquele momento. Formulários
  reais passaram a consumir controles, e `card`/`separator` foram retirados no
  [PR #186](https://github.com/evertonschuster/Agenza/pull/186). Não decidir novamente pela lista velha.

## Limite da evidência

O registro antigo descreve inspeção real de contraste, temas e trilho compacto, mas também marca
checkboxes de aceite manual que nunca foram preenchidos integralmente. Isso não permite declarar
aprovados safe area em aparelho físico, ausência de zoom/ocultação pelo teclado móvel ou todos os
cenários visuais em qualquer viewport. Os critérios únicos da antiga checklist estão preservados
em US1/US2/US4/US5 da spec, sem alegação de execução nova.

Comandos reutilizáveis estão no [README](../../README.md), e o alcance dos testes em
[QUALITY](../../../../docs/QUALITY.md). Nenhum teste de aplicação foi executado nesta manutenção.
