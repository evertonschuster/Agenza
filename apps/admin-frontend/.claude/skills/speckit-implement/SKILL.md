---
name: speckit-implement
description: Implementar as tarefas existentes do Agenza e demonstrar o comportamento
  alterado.
argument-hint: 'Optional implementation guidance or task filter'
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: preset:agenza-proportional
user-invocable: true
disable-model-invocation: false
---

# Speckit Implement Skill

Leia .specify/presets/agenza-proportional/workflow.md antes de executar esta etapa.

1. Execute .specify/scripts/powershell/check-prerequisites.ps1 -Json -RequireTasks -IncludeTasks.
   Leia spec.md, plan.md, tasks.md e a constituição. Leia apenas auxiliares existentes e relevantes.
   Ausência de research.md, data-model.md, contracts/ ou quickstart.md não bloqueia a implementação.
2. Confira checklists existentes conforme a política comum. Não crie checklists novos
   para habilitar esta etapa e não trate implementação como aprovação de revisão.
3. Execute as tarefas autorizadas na ordem de dependências, preservando os arquivos fora
   do escopo e as decisões vigentes. Um conflito de requisitos exige resolução explícita;
   uma oportunidade de melhoria incidental não amplia a tarefa.
4. Valide comportamento e falhas afetados com os testes e gates aplicáveis. Se as tarefas
   omitiram um risco material, inclua a verificação necessária no escopo da mudança.
   Não crie testes de aplicação somente para validar redação.
5. Marque cada tarefa concluída somente após produzir sua evidência. Relate o que executou,
   o que falhou e o que continua pendente; não crie um relatório Markdown de implementação.
