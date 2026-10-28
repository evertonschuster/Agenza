# ADR 0087 — Spec Kit proporcional por preset local

Status: accepted (2026-10-28); effective on merge.

## Context

O fluxo padrão criava pesquisa, modelo de dados, contratos, quickstart e checklists mesmo em
mudanças pequenas. Os comandos eram distribuídos para três hosts, enquanto o estado da instalação
declarava somente Codex. Alterar cada cópia separadamente repetiria o problema registrado na
[ADR 0016](0016-ai-agent-governance-framework.md).

A instalação existente já resolve templates por presets e materializa comandos por integração.
Seus scripts ainda exigem spec.md, plan.md e tasks.md; suportar um único arquivo exigiria mudar
esses contratos e manter uma adaptação adicional.

## Decision

Usar o preset local
[agenza-proportional](../../apps/admin-frontend/.specify/presets/agenza-proportional/preset.yml)
como fonte editável dos templates e comandos personalizados. O engine do Spec Kit gera os adapters
de Codex, Claude e Copilot. O estado da instalação reconhece os três, mantendo Codex como padrão.
As skills Agenza e a política de fonte única da [ADR 0041](0041-ai-instruction-files-reinstated.md)
não mudam.

Correções determinísticas sem comportamento novo podem ser executadas diretamente. Features
mantêm o mínimo compatível spec/plan/tasks. Pesquisa, modelo de dados, contratos adicionais,
quickstart e checklist exigem uma razão ligada à mudança; não se cria arquivo para declarar
que ele não se aplica. Testes novos são selecionados por comportamento e risco, preservando
os gates existentes, independentemente de pedido literal de testes.

A política operacional fica no
[workflow do preset](../../apps/admin-frontend/.specify/presets/agenza-proportional/workflow.md).
Não se acrescenta sincronizador caseiro nem se altera o core para implementar compactação.
O converge continua comparando código e artefatos e acrescenta somente lacunas ainda não
cobertas por tarefas pendentes.

## Consequences

Templates são resolvidos quando usados; adapters precisam de nova materialização após alterar
a fonte de um comando. Ativar uma integração pelo CLI também pode atualizar o core, portanto o
diff de tooling precisa ser revisado. Geração comprovada não implica execução verificada na UI
de todos os hosts.

Os templates core permanecem como distribuição upstream; o preset possui a customização.
A ausência de auxiliares opcionais deixa de bloquear o fluxo. Evidências de uma execução ficam
no PR/CI, sem outro relatório permanente.

## Alternatives considered

Um único artefato para features pequenas reduziria arquivos, mas exigiria alterar os scripts
de pré-requisitos e todos os consumidores; manter três artefatos pequenos evita esse acoplamento.
Editar os adapters à mão foi rejeitado porque criaria fontes paralelas de uma mesma política.
Atualizar o core apenas para regenerar comandos foi testado em fixture e descartado desta mudança:
o CLI instalado também substituía scripts sem necessidade para a P4.

## Validation

Exercícios descartáveis cobrem texto, UI e sessão/tenant; os scripts reais verificam resolução
de templates e pré-requisitos sem auxiliares. O teste de converge compara implementação ausente
com tarefa concluída e repete a execução para verificar que não duplica a pendência.
