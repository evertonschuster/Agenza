---
description: Definir comportamento e aceite de uma feature do Agenza com documentação proporcional.
---

Leia .specify/presets/agenza-proportional/workflow.md antes de executar esta etapa.

1. Avalie se o pedido é uma correção determinística sem comportamento novo. Nesse caso,
   execute ou encaminhe a correção direta, sem inicializar feature ou pacote documental.
2. Para uma feature nova, execute .specify/scripts/powershell/create-new-feature.ps1 -Json
   -ShortName <nome-em-kebab> com a descrição como argumento. Use os caminhos retornados.
   Só reutilize uma feature existente quando o pedido indicar essa continuidade.
3. Resolva spec-template por .specify/scripts/powershell/resolve-template.ps1 spec-template -Json.
   Preencha a spec com escopo, jornadas, comportamento observável e critérios verificáveis.
   Consulte a constituição e somente as decisões relevantes. Remova seções sem conteúdo útil.
4. Esclareça somente ambiguidades que alterem escopo, segurança, contrato ou aceite;
   registre premissas reversíveis de baixo impacto. Não invente requisitos.
5. Revise internamente a qualidade da spec. Não crie requirements.md automaticamente.
   Se uma revisão adicional for necessária por risco concreto, explique seu objetivo antes
   de produzir um checklist curto. Esta etapa não produz plano, tarefas ou auxiliares.
