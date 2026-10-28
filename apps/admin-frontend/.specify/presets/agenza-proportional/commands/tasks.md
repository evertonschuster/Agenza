---
description: Gerar tarefas com dependências reais e validação por comportamento e risco.
---

Leia .specify/presets/agenza-proportional/workflow.md antes de executar esta etapa.

1. Execute .specify/scripts/powershell/setup-tasks.ps1 -Json. Leia spec.md, plan.md e o
   TASKS_TEMPLATE_CONTENT retornado. AVAILABLE_DOCS não é uma lista de arquivos obrigatórios.
2. Leia auxiliares disponíveis somente se necessários para derivar tarefas. Não exija
   research.md, data-model.md, contracts/ ou quickstart.md para prosseguir.
3. Produza tasks.md no formato - [ ] T001 [P] [US1] descrição com caminho real.
   Vincule tarefas aos critérios de aceite; omita setup, infraestrutura e polimento fictícios.
   Use [P] apenas quando não houver dependência nem disputa por arquivos. Uma prova técnica
   da qual a abordagem depende deve bloquear suas tarefas consumidoras, nunca ficar somente
   na validação final. Preserve esse gate mesmo quando o ambiente ainda não permite executá-lo.
4. Inclua testes que detectem falhas concretas conforme comportamento e risco. Para sessão
   ou tenant, inclua cenários de falha e regressão mesmo sem pedido literal de testes.
   Para texto ou manutenção sem comportamento novo, selecione validação proporcional.
5. Registre somente dependências úteis e os checks finais aplicáveis. Não produza auxiliares,
   exemplos de paralelismo sem uso ou outro documento de resumo.
