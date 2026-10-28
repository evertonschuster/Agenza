---
description: Comparar o código com a feature do Agenza e acrescentar somente o trabalho residual às tarefas.
---

Leia .specify/presets/agenza-proportional/workflow.md antes de executar esta etapa.
Quando o pedido for somente revisão, mantenha todos os arquivos intactos e não execute hooks de escrita.

1. Resolva os caminhos por .specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly.
   Confira spec.md, plan.md e tasks.md. Aponte pré-requisitos ausentes sem criar arquivos de preenchimento.
2. Compare os requisitos, critérios de aceite e tarefas com o código e testes atuais indicados
   no plano. Um checkbox concluído não comprova implementação. Consulte a constituição
   e somente os auxiliares existentes e pertinentes; ausência de auxiliar opcional não é falha.
3. Identifique trabalho ausente, parcial ou contraditório dentro do escopo da feature.
   Diferencie lacuna de implementação de preferência arquitetural e de intenção indefinida.
   Uma escolha material ainda indefinida exige resolução antes de produzir a tarefa dependente.
4. Depois da implementação, acrescente ao final de tasks.md somente lacunas acionáveis ainda
   não cobertas por uma tarefa pendente. Preserve IDs e conteúdo existentes, continuando a
   numeração; não reabra nem duplique tarefas e não crie uma seção vazia. Se as tarefas
   pendentes já cobrem o trabalho, indique seus IDs sem acrescentar cópias.
5. Não altere spec.md, plan.md ou código nesta etapa. Sem lacunas novas, tasks.md permanece
   byte a byte intacto. Entregue evidências e pendências na resposta, sem gerar relatórios
   de rodadas, checklists ou outro artefato de execução.
