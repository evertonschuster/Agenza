---
description: Criar uma revisão curta de requisitos quando solicitada ou justificada por risco concreto.
---

Leia .specify/presets/agenza-proportional/workflow.md antes de executar esta etapa.

1. A invocação explícita solicita um checklist. Fora dela, identifique primeiro o risco
   específico que a revisão precisa esclarecer; não gere um checklist por rotina.
2. Execute .specify/scripts/powershell/check-prerequisites.ps1 -Json -PathsOnly.
   Leia a spec selecionada. Plano e tarefas não são pré-requisitos desta revisão;
   consulte-os ou consulte auxiliares somente quando pertinentes e existentes.
3. Resolva checklist-template com .specify/scripts/powershell/resolve-template.ps1
   checklist-template -Json. Gere apenas os critérios que respondam ao objetivo da revisão,
   com ligação a requisitos e decisões pertinentes. Não invente meta mínima de itens.
4. Grave o checklist em checklists/<assunto>.md sem sobrescrever uma revisão existente.
   Itens começam pendentes; [x] significa aprovação do critério com evidência por quem revisa,
   não conclusão de implementação. Não produza spec, plano, tarefas ou auxiliares nesta etapa.
