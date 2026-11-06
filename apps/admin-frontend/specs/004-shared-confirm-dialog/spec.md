# Especificação: diálogo de confirmação reutilizável

**Criada em**: 2026-09-14.
**Status**: implementada; registro histórico do pedido original, com desenho posteriormente evoluído.
**Evidência**: [PR #125, commit 84a54da3](https://github.com/evertonschuster/Agenza/pull/125),
que integrou o componente e sua adoção em Etiquetas. As tarefas encerradas estão em [tasks.md](tasks.md).

O pedido foi extrair a confirmação de exclusão de Etiquetas para um componente configurável.
Este documento preserva o escopo e os critérios daquela entrega; não define a API atual do widget.
As diferenças posteriores estão em [plan.md](plan.md#evolução-posterior).

## Decisões de escopo do pedido

- Migrar somente a exclusão de Etiquetas. Uma segunda configuração em teste comprovaria reutilização;
  construir outra rotina real ficava fora da entrega.
- Cobrir ações destrutivas, com destaque vermelho e aviso genérico de falha. O ícone do botão de
  confirmar seria escolhido pela rotina; o ícone de aviso permaneceria genérico.
- Exigir testes reais e inclusão no gate de cobertura, pois o componente tem comportamento e
  consumidor real. A localização em uma pasta de UI não justificava isenção.
- Preservar a experiência de exclusão existente; não mudar regras de negócio ou mensagens do backend.

## Histórias e aceite original

### US1 — Preservar a exclusão de etiquetas (prioridade original P1)

A extração deveria manter os quatro fluxos observáveis:

1. Confirmar uma etiqueta livre a exclui, mostra sucesso e fecha o diálogo.
2. Cancelar ou fechar antes da confirmação não exclui nada.
3. Uma etiqueta em uso produz explicação do bloqueio, sem repetir a mesma ação.
4. Uma falha passageira mantém a confirmação aberta, explica a falha e oferece nova tentativa.

### US2 — Configurar outra confirmação sem reconstruir seus estados (prioridade original P1)

1. Título, descrição, rótulos, ícone e ação próprios aparecem sem referências a Etiquetas.
2. Instâncias com configurações diferentes mantêm suas próprias mensagens de bloqueio e sucesso.

A comprovação era uma configuração isolada em teste, sem exigir uma segunda tela real.

### Casos de borda do pedido

- Cliques repetidos durante o envio não iniciam novas tentativas.
- Mensagens longas ou incomuns são exibidas sem parsing ou truncamento introduzido pela extração.
- Instâncias não compartilham estado entre rotinas.
- O pedido original permitia fechar durante o envio sem cancelar a operação. Essa escolha foi
  substituída: o componente implementado bloqueia o fechamento durante a confirmação; ver
  [evolução](plan.md#evolução-posterior).

## Requisitos originais

### Funcionais

- **FR-001**: Disponibilizar um componente comum de diálogo de confirmação.
- **FR-002**: Receber, por configuração da rotina, ao menos título, descrição, rótulo e ícone do
  botão de confirmação e a ação executada; não fixar a rotina de Etiquetas no componente.
- **FR-003**: Representar confirmação, bloqueio por regra de negócio sem repetição e falha passageira
  com nova tentativa sem fechar o diálogo.
- **FR-004**: Centralizar a classificação então usada em Etiquetas: rede, sessão e servidor como
  falhas passageiras; as demais como bloqueantes. A taxonomia evoluiu depois desta entrega.
- **FR-005**: Impedir novo envio enquanto uma tentativa estiver em andamento.
- **FR-006**: Preservar textos, ordem dos botões e comportamento observável da exclusão na migração.
- **FR-007**: Entregar somente a migração de Etiquetas, provando configuração alternativa por teste.
- **FR-008**: Limitar o pedido a ações destrutivas, com botão vermelho e aviso genérico fixo nos
  estados de falha. Confirmações neutras estavam fora desse escopo original.
- **FR-009**: Permitir configurar a mensagem de sucesso, incluindo o nome do item afetado.
- **FR-010**: Manter os textos visíveis e os rótulos auxiliares padrão em pt-BR.

### Não funcionais

- **NFR-001**: Preservar os gates de qualidade existentes, sem afrouxá-los para a extração.
- **NFR-002**: Não depender de dado, tipo ou regra exclusiva de Etiquetas ou de outra rotina;
  informações específicas chegam por configuração.
- **NFR-003**: Cobrir o comportamento por testes reais, sem adicionar o componente à lista de isenção
  de cobertura por analogia com outros primitivos.

## Critérios de sucesso originais

- **SC-001**: Sucesso, cancelamento, bloqueio e falha passageira preservam a experiência da migração.
- **SC-002**: Outra rotina configura texto e ação sem reimplementar estados nem envio duplicado.
- **SC-003**: A classificação compartilhada produz o mesmo tratamento da falha nas rotinas consumidoras.

## Evidência e uso deste registro

O [plano](plan.md) preserva as alternativas e a evolução; [tasks.md](tasks.md) registra o encerramento.
Para alterar o componente, consulte os
[tipos atuais](../../src/widgets/confirm-dialog/confirm-dialog.types.ts), o
[widget](../../src/widgets/confirm-dialog/index.tsx) e seus
[testes de comportamento](../../src/widgets/confirm-dialog/confirm-dialog.test.tsx).
Essas referências não significam que a suíte foi executada novamente nesta consolidação documental.
