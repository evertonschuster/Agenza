---
name: speckit-analyze
description: Revisar a coerência de spec, plano e tarefas do Agenza sem alterar arquivos.
argument-hint: 'Optional focus areas for analysis'
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: preset:agenza-proportional
user-invocable: true
disable-model-invocation: false
---

# Speckit Analyze Skill

Leia .specify/presets/agenza-proportional/workflow.md. Esta etapa é somente leitura;
não execute hooks que possam escrever arquivos.

1. Execute .specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly.
   Confira a existência de spec.md, plan.md e tasks.md nos caminhos retornados.
   Se faltar um desses três, informe o pré-requisito correspondente.
2. Leia esses três artefatos e as restrições pertinentes da constituição. Leia auxiliares
   somente quando existirem e sustentarem algum requisito ou decisão afetada.
3. Verifique cobertura do aceite pelas tarefas, dependências, ambiguidades materiais,
   conflitos com decisões atuais e validação proporcional ao risco.
   A ausência de auxiliar opcional não é achado por si só.
4. Relate achados concretos com arquivo/linha, consequência e direção da correção.
   Diferencie defeito, risco e sugestão. Não atribua severidade alta somente por formato.
5. Entregue a revisão na resposta. Não grave analysis.md, checklist, baseline ou outro relatório.
   Não altere os artefatos durante esta análise.
