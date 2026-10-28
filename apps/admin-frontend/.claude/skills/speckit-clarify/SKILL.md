---
name: speckit-clarify
description: Resolver ambiguidades materiais de uma spec do Agenza preservando seu
  escopo.
argument-hint: 'Optional areas to clarify in the spec'
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: preset:agenza-proportional
user-invocable: true
disable-model-invocation: false
---

# Speckit Clarify Skill

Leia .specify/presets/agenza-proportional/workflow.md antes de executar esta etapa.

1. Execute .specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly.
   Leia a spec selecionada e as restrições pertinentes. Esta etapa pode ocorrer antes
   do plano e das tarefas; auxiliares opcionais ausentes não são ambiguidades.
2. Identifique perguntas cuja resposta altere comportamento, segurança, contrato, escopo
   ou aceite. Priorize as que impedem uma implementação segura; não faça um questionário
   completo quando a spec já é suficiente.
3. Incorpore respostas e premissas aceitas no trecho pertinente da spec, corrigindo
   contradições no próprio texto. Preserve decisões históricas com seu contexto.
4. Atualize uma revisão de requisitos existente somente com evidência. Não crie checklist,
   research.md ou outro documento para registrar a conversa. Relate o que mudou e as
   perguntas materiais ainda pendentes.
