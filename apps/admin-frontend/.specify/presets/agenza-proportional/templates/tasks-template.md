---
description: 'Tarefas da mudança, ordenadas por dependências e validadas conforme o risco.'
---

# Tarefas: [FEATURE NAME]

**Entradas**: [spec.md](spec.md) e [plan.md](plan.md). Leia auxiliares somente quando existirem
e forem necessários à tarefa.

Use `- [ ] T001 [P] [US1] descrição em caminho real`. IDs são sequenciais; `[P]` só indica
trabalho sem dependência pendente e sem disputa pelos mesmos arquivos. `[US1]` liga a tarefa
à jornada da spec. Tarefas transversais podem omitir a jornada. Substitua os exemplos abaixo.

## US1 — [jornada e resultado verificável]

- [ ] T001 [US1] [Implementar o comportamento em caminho real.]
- [ ] T002 [US1] [Verificar o comportamento ou risco alterado em caminho real.]

Acrescente jornadas ou tarefas transversais apenas quando necessárias. Inclua testes novos
quando o comportamento ou risco justificar, sem depender de pedido explícito de testes.
Indique qual falha eles detectam. Para mudança sem comportamento novo, escolha a validação
proporcional; não crie testes de aplicação para conferir redação.

## Dependências e validação final

[Registre a ordem necessária, quais tarefas podem ocorrer em paralelo e os checks aplicáveis.
Não invente fases de setup, infraestrutura, polimento ou exemplos paralelos sem trabalho real.]

O conjunto precisa cobrir os critérios de aceite. Registre a execução e seus resultados no PR;
marque uma tarefa como concluída somente depois de produzir a evidência que ela exige.
