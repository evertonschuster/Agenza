# Plano histórico: diálogo de confirmação reutilizável

**Status**: entrega integrada no [PR #125](https://github.com/evertonschuster/Agenza/pull/125);
parte do desenho inicialmente planejado foi substituída durante sua evolução.
**Escopo e aceite**: [spec.md](spec.md). **Execução encerrada**: [tasks.md](tasks.md).

## Desenho inicial e razões preservadas

1. O plano escolhia um primitivo apresentacional em `shared/ui`, alimentado por estado derivado pelo
   consumidor. `useFetcher<typeof action>()` dependia da rota e o resultado chegava em renderização
   posterior, não como retorno de `fetcher.submit()`. Fazer o componente controlar o envio naquele
   desenho exigiria uma ponte fetcher/Promise sem necessidade demonstrada. Render props e componentes
   compostos foram descartados por ampliar a API para um único consumidor real.
2. A classificação passageira/bloqueante seria uma função pura em `servicesFacade.ts`, junto dos
   problemas compartilhados que consultava. Evitava tanto regra duplicada em cada rotina quanto um
   arquivo separado apenas para essa função pequena.
3. O botão aceitava `LucideIcon`, seguindo a convenção existente em vez de inventar um tipo de ícone.
4. O componente teria cobertura real: comportamento de estados e consumidor efetivo não justificavam
   copiar a isenção de primitivas com partes de scaffold sem uso. Não foram introduzidos limiares novos.
5. O plano mantinha toast e envio no adaptador da rotina, acompanhando o desenho com `useFetcher`.
6. Título, descrição, ação/ícone e título de bloqueio eram configuração explícita; somente rótulos
   auxiliares genéricos tinham defaults pt-BR. Um título padrão sobre excluir seria inadequado para
   desativar ou remover. Não havia entidade de dados ou contrato HTTP novo.

## Evolução posterior

O registro de implementação do PR #125 já substituiu as escolhas 1 e 5: ao abandonar `useFetcher`,
`ConfirmDialog` passou a controlar o envio assíncrono, consumir `ApiResult` e emitir o toast de sucesso.
A composição com comportamento ficou em `widgets/`, conforme a
[ADR 0042](../../../../docs/adr/0042-admin-frontend-widgets-layer-and-layer-boundaries-rule.md).
O componente deixou de ser o primitivo apresentacional descrito no plano inicial.

Outras diferenças que impedem usar os requisitos históricos como receita da API atual:

- O widget é montado aberto, tem estado interno e bloqueia fechar/cancelar durante o envio. A escolha
  inicial de permitir fechamento nessa etapa não descreve o comportamento implementado.
- A configuração agrupada tem defaults também para textos de ação e bloqueio. A obrigatoriedade de
  todas as props descrita no contrato inicial foi substituída; os tipos são a fonte atual.
- [PR #185](https://github.com/evertonschuster/Agenza/pull/185) e
  [ADR 0075](../../../../docs/adr/0075-admin-frontend-rate-limit-is-a-transient-problem.md) incluem
  rate limit no tratamento passageiro, sem repetição automática ou temporizador que retenha o botão.
- [PR #192](https://github.com/evertonschuster/Agenza/pull/192) e
  [ADR 0077](../../../../docs/adr/0077-admin-frontend-client-edit.md) acrescentam a confirmação de
  mudança de situação de Pessoas, incluindo variante comum para reativar. Portanto, o escopo
  exclusivamente destrutivo da FR-008 registra a entrega original, não uma proibição vigente.

Para manutenção, consulte o [guia atual](../../docs/ARCHITECTURE.md#1-shape), os
[tipos do widget](../../src/widgets/confirm-dialog/confirm-dialog.types.ts) e a
[classificação efetiva](../../src/shared/api/servicesFacade.ts).
O [snapshot anterior dos artefatos](https://github.com/evertonschuster/Agenza/tree/38d2dbd99ddb7a28aba39bf1e7434518cf78c391/apps/admin-frontend/specs/004-shared-confirm-dialog)
preserva as tabelas de props e o roteiro detalhado do desenho abandonado; não são um contrato vigente.
