# Decisões: processo

## Documentação, decisões e instruções para agentes

### Decisão

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

**Edição no lugar.** Enquanto o produto não está em produção, uma decisão que muda é reescrita no
próprio arquivo, sem status, data nem cadeia de emendas; o git guarda o histórico. O que deixou de
valer entra em Rejeitado com o motivo.

**Commits de review não alteram Markdown.** Se o comportamento mudou, muda o teste. ADRs e guias
tocados pelo PR são fechados no último commit antes do merge.

**Planejamento sem ferramenta de spec.** Antes de codar comportamento novo, as dúvidas materiais vão
ao dono numa única rodada de perguntas em lote, cada uma com a opção recomendada. Um protótipo
aprovado é a referência visual. Critérios de aceite viram testes nomeados em pt-BR no mesmo PR; uma
correção de protótipo vira teste ou código. Plano e tarefas ficam na sessão do agente.

**Hosts de agente.** `CLAUDE.md` importa o `AGENTS.md`; o Copilot lê a ponte em
`.github/copilot-instructions.md`; o Codex segue a hierarquia de `AGENTS.md`. Não há espelhos
editáveis, sincronização caseira nem symlinks entre essas fontes.

**Checagem mecânica.** `npm run check:docs` confere links e os imports dos `CLAUDE.md`. Ele não
verifica se o texto concorda com o código.

### Por quê

O registro anterior (92 ADRs e as specs do Spec Kit) acumulava cadeias de emendas e mudava em quase
todo PR. Sem produção, foi refeito do zero; o anterior está na tag `docs-archive-2026-11-14`.

### Rejeitado

- **Framework de governança com cópias sincronizadas por host.** As cópias divergiam e as checagens
  comparavam cópias, não o conteúdo; foi abandonado.
- **Spec Kit com preset local.** Pouco uso, 67 arquivos e rematerialização pela CLI a cada mudança
  de comando.
- **Um documento vivo de comportamento por feature** (`behavior.md`, `docs/features/`). Repete o
  problema da spec: todo review precisaria sincronizá-lo.
- **ADR imutável com ciclo proposta/aceita antes da produção.** Gerava emendas e commits só de
  status; o git já guarda o histórico.

### Reversão

Se em duas features novas um agente repetir uma ambiguidade já resolvida por falta de registro,
volta um template de spec de arquivo único, com comportamento e aceite, sem ferramenta.

## Git, CI e toolchain

### Decisão

- **Trunk-based.** Só `main` é permanente e está sempre liberável. Trabalho vai por PR, numa branch
  curta cortada da `main` atualizada; nada é commitado direto na `main`.
- **Uma feature que atravessa backend e frontend vira dois PRs**, ambos cortados da `main`: o do
  backend primeiro, levando os tipos OpenAPI regenerados; depois o do frontend. Cada um passa
  sozinho nos seus gates.
- **O CI é a autoridade dos gates.** O repositório não instala hooks locais; quem contribui, pessoa
  ou agente, roda os comandos aplicáveis antes de declarar o trabalho pronto.
- **Pins de compatibilidade ficam até a linha estável seguinte suportar a mudança**, por exemplo o
  TypeScript até o typescript-eslint estável aceitar a versão nova. O motivo de cada pin fica no PR
  que o cria.

### Rejeitado

- **Uma branch permanente de `develop` ou staging.**
- **Husky e lint-staged.** Duplicavam o CI e travavam commits locais sem ser a autoridade.
- **Um pre-commit que recusasse commits na `main`.** A proteção da branch no GitHub já é essa
  autoridade.

## Testes e verificação

### Decisão

- **O backend não tem camada de integração in-process.** Nada de Testcontainers nem
  `WebApplicationFactory`. `PersistenceTests` com EF InMemory existem só para provar atribuição de
  tenant, filtros, conversões e a cobertura de vínculos na exclusão de etiquetas.
- **A prova real roda no stack Aspire**, no job de contrato do CI: migrations do zero, OIDC,
  isolamento entre tenants, FKs de tenant e drift dos tipos gerados.
- **Testes são escolhidos pelo comportamento e pelo risco**, incluindo caminhos de recusa. Uma
  mudança só de documentação confere referências, formatação e diff.
- Uma propriedade do PostgreSQL fora do alcance dos smokes é verificada à mão num banco descartável,
  e o que rodou fica registrado no PR.

### Rejeitado

- **Projetos de integração com PostgreSQL em container no CI.** Subiam de cinco a sete containers em
  paralelo e foram removidos em vez de estabilizados.
- **Uma camada dedicada de testes de runtime** com Testcontainers e host in-process. Foi criada e
  removida: o job do Aspire prova as mesmas fronteiras com o stack real.
- **FluentAssertions 8 ou posterior**, por licença.
