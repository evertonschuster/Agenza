# ADR 0093 — Ciclo de vida das ADRs e commits de review

Status: proposta (2026-11-14); passa a aceita no merge. Substitui o parágrafo de criação e
evolução de ADRs da [ADR 0088](0088-ai-instruction-sources-and-proportional-documentation.md);
o restante da 0088 continua vigente.

## Contexto

Dos últimos 60 PRs da `main`, 38 alteraram `docs/adr` e 18 alteraram arquivos do Spec Kit. A ADR
do SearchSelect mudou em cinco commits do próprio PR, acompanhando refactors de review. O índice
mudou 38 vezes em 200 commits e acumulou qualificadores como "0074 as amended by 0076 and narrowed
by 0091", que obrigam o leitor a compor várias ADRs para saber o que vale.

Números também colidiram entre branches paralelas: a ADR do SearchSelect nasceu 0090, a `main`
ocupou esse número com os smokes de tenant, e ela e a seguinte foram renumeradas.

A 0088 já limitou quando criar uma ADR, mas permitiu notas de evolução datadas dentro de uma ADR
aceita. Nygard descreve a ADR como um texto curto sobre uma decisão arquiteturalmente
significativa, substituído por outro quando a decisão muda, e não reescrito.

## Decisão

1. **Quando.** Continuam valendo os casos da 0088: fronteira, segurança, contrato compartilhado,
   persistência, operação, dependência relevante e alto custo de reversão. Comportamento de uma
   tela ou de um componente, ajuste reversível e iteração de review ficam fora: vivem no código,
   nos testes e no PR.
2. **Ciclo.** Enquanto o PR está aberto, a ADR é `proposta` e pode mudar. No último commit antes
   do merge, ela passa a `aceita`, com data. Aceita, só muda a linha de status, para apontar a
   substituta. Uma decisão nova substitui a anterior inteira ou nomeia a seção que deixa de valer;
   não se acrescentam notas de evolução ao corpo de uma ADR aceita.
3. **Número.** É provisório durante o PR. Ao fechar a ADR, usa-se o próximo número livre da `main`.
4. **Índice.** As linhas de decisões vigentes listam ADRs sem qualificadores como "as amended by"
   ou "as narrowed by". O que deixou de valer vai para a tabela de decisões substituídas. As linhas
   que já têm qualificadores são consolidadas em mudança própria, sem reescrever ADRs antigas.
5. **Commits de review.** Um commit de refactor durante o review não altera Markdown. Se o
   comportamento mudou, muda o teste. ADRs e guias tocados pelo PR são fechados no último commit
   antes do merge.

## Consequências

- O Markdown de um PR muda uma vez, no fechamento; os diffs de review ficam em código e testes.
- As iterações de review continuam registradas no PR, como a 0088 já define.
- Até a consolidação, algumas linhas do índice mantêm qualificadores.
- Substituição parcial continua possível, desde que nomeada no status da ADR antiga e na tabela de
  substituídas.

## Alternativas consideradas

- **Índice gerado a partir de frontmatter:** exigiria migrar 92 ADRs e geraria mais alterações do
  que remove. Rejeitado por ora.
- **Arquivar as ADRs de tela (0070–0086):** seria um corte arbitrário e contrariaria a
  imutabilidade. As novas regras só impedem que surjam outras desse tipo.
- **Manter notas de evolução datadas:** conserva o contexto num lugar só, mas mantém ADRs aceitas
  mudando e o leitor compondo emendas.

## Validação

`npm run check:docs` confere referências e falha quando um número do índice corresponde a mais de
um arquivo. Esta ADR segue o próprio ciclo: proposta durante o PR, aceita no merge.
