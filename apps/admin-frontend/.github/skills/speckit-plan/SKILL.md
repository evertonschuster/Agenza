---
name: speckit-plan
description: Planejar uma feature do Agenza e criar somente os artefatos justificados
  pela mudança.
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: preset:agenza-proportional
---

# Speckit Plan Skill

Leia .specify/presets/agenza-proportional/workflow.md antes de executar esta etapa.

1. Execute .specify/scripts/powershell/setup-plan.ps1 -Json e use FEATURE_SPEC e IMPL_PLAN.
   Leia a spec, a constituição e somente o código e referências afetados.
2. Preencha o plano com abordagem, arquivos, dependências reais, riscos e validação.
   Resolva incertezas que impeçam uma abordagem segura; não pesquise tecnologias já decididas
   sem motivo relacionado à mudança. Se a prova necessária não puder ser executada no ambiente,
   declare a abordagem condicionada e coloque a prova como pré-requisito do trabalho dependente;
   não a adie para a validação final nem declare o plano pronto para implementação.
3. Aplique os critérios de artefatos adicionais da política comum. Documente no plano
   a pergunta que cada auxiliar resolve e crie somente os justificados. Sem motivo, o único
   arquivo desta etapa é plan.md. Não crie auxiliares para declarar ausência de impacto.
4. Compare a abordagem com as restrições pertinentes da constituição. Explique conflitos
   reais, sem copiar um checklist constitucional inteiro. Não atualize inventários
   de ferramentas ou arquivos de instrução do agente a cada planejamento.
5. Relate o plano e os auxiliares que realmente existem. A ausência dos demais é esperada.
