# ADR 0001 — Documentação, decisões e instruções para agentes

Status: aceita (2026-11-15). Recomeça o registro de decisões; as ADRs
anteriores, as specs e o Spec Kit estão na tag `docs-archive-2026-11-14`.

## Decisão

**Cada informação tem uma casa.** O resto aponta para ela, sem copiar.

| Fonte                               | Guarda                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------- |
| Código, configuração, pins e CI     | O comportamento implementado e o que é de fato verificado               |
| Testes                              | Comportamento e critérios de aceite                                     |
| `AGENTS.md` da raiz e de cada área  | Invariantes e roteamento por tarefa                                     |
| `docs/ARCHITECTURE.md` de cada área | Forma vigente, convenções e o que já foi tentado e descartado           |
| Skills em `.claude/skills/agenza-*` | Procedimentos, apontando para a regra em vez de restatá-la              |
| ADRs em `docs/decisions/`           | Decisão durável, seu porquê e as alternativas rejeitadas                |
| PR                                  | A conversa com o dono, as iterações de review e a evidência de execução |

**Só se escreve o que o código não mostra.** Layout de pastas, inventários, versões e status de
feature não entram em prosa.

**Quando há ADR.** Mudança de fronteira, segurança, contrato compartilhado, persistência, operação,
dependência relevante ou escolha cara de reverter. Comportamento de uma tela ou de um componente,
ajuste reversível e iteração de review ficam no código, nos testes e no PR.

**Ciclo da ADR.** É `proposta` enquanto o PR está aberto e pode mudar. No último commit antes do
merge passa a `aceita`, com data e o próximo número livre da `main`. Aceita, só muda a linha de
status. Uma decisão nova substitui a anterior inteira ou nomeia a seção que deixa de valer. O índice
lista só ADRs vigentes, sem qualificadores como "as amended by".

**Commits de review não alteram Markdown.** Se o comportamento mudou, muda o teste. ADRs e guias
tocados pelo PR são fechados no último commit antes do merge.

**Planejamento sem ferramenta de spec.** Antes de codar comportamento novo, as dúvidas materiais vão
ao dono numa única rodada de perguntas em lote, cada uma com a opção recomendada. Um protótipo
aprovado é a referência visual. Critérios de aceite viram testes nomeados em pt-BR no mesmo PR; uma
correção de protótipo vira teste ou código. Plano e tarefas ficam na sessão do agente.

**Hosts de agente.** `CLAUDE.md` importa o `AGENTS.md`; o Copilot lê a ponte em
`.github/copilot-instructions.md`; o Codex segue a hierarquia de `AGENTS.md`. Não há espelhos
editáveis, sincronização caseira nem symlinks entre essas fontes.

**Checagem mecânica.** `npm run check:docs` confere links, imports dos `CLAUDE.md`, metadados das
skills e os números do índice de ADRs. Ele não verifica se o texto concorda com o código.

## Por quê

Até 2026-11 o repositório acumulou 92 ADRs (7,8 mil linhas) para um produto com login, pessoas e
etiquetas. Muitas descreviam uma tela, o índice precisava de cadeias de emendas para dizer o que
valia, e 38 dos últimos 60 PRs alteraram ADRs. O Spec Kit gerou 9 specs em cerca de 6 PRs, com 67
arquivos de ferramenta, um plano reeditado a cada refactor e esclarecimentos datados que um agente
lia como requisito. Como o produto não está em produção, o registro foi refeito do zero.

## Rejeitado

- **Framework de governança com cópias sincronizadas por host.** As cópias divergiam e as checagens
  comparavam cópias, não o conteúdo; foi abandonado.
- **Spec Kit com preset local.** Pouco uso, 67 arquivos e rematerialização pela CLI a cada mudança
  de comando.
- **Um documento vivo de comportamento por feature** (`behavior.md`, `docs/features/`). Repete o
  problema da spec: todo review precisaria sincronizá-lo.
- **Uma skill nova de esclarecimento.** Duplicaria um hábito que os agentes já seguem.
- **Índice de ADRs gerado por frontmatter.** Mais tooling para manter um índice que, com poucas
  ADRs, cabe numa tabela curta.
- **Manter as 92 ADRs e consolidá-las aos poucos.** Deixaria as cadeias de emendas valendo por meses.

## Reversão

Se em duas features novas um agente repetir uma ambiguidade já resolvida por falta de registro,
volta um template de spec de arquivo único, com comportamento e aceite, sem ferramenta.
