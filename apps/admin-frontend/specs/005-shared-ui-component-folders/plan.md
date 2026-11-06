# Plano histórico — spec 005

**Estado:** executado e revisado; descreve a migração, não um inventário atual de componentes.
O aceite está na [spec](spec.md); o resultado e as tarefas superadas estão em [tasks](tasks.md).

## Abordagem retida

A migração foi local ao frontend, por componente, mantendo o import `@/shared/ui/<nome>` resolvido pelo
novo `index.tsx`. Raiz, tipos puros e subpartes passaram a ter responsabilidades distintas, sem criar
pacote novo nem alterar a API pública. Os imports relativos precisavam acompanhar a nova profundidade;
os aliases absolutos preservavam os consumidores.

Os testes colocados junto foram movidos com o componente e continuaram importando seu ponto público,
com import relativo `.` quando aplicável. A lista de exclusão de cobertura passou de arquivos para
pastas somente nos caminhos já excluídos, preservando seu significado. Um valor agregado de cobertura
não substitui conferir esse mapeamento.

O limite de import de subpartes dependia de revisão: a configuração de lint da migração não adicionou
uma regra dedicada a FR-006. Essa limitação não deve ser recontada como garantia automática.

## Decisões e alternativas preservadas

Os IDs abaixo identificam as decisões do antigo arquivo de pesquisa, conservadas para permitir
consultar sua evolução no Git.

| Decisão | Escolha histórica e motivo                                                                                                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1      | O ponto público mantém a raiz e reexporta a superfície existente; `Toast` e `Toaster` podiam coexistir como raízes sem quebrar consumidores. A proposta inicial de um arquivo por dependente foi restringida em D10. |
| D2      | `cva()` e `VariantProps` derivados ficam com a peça usuária. O arquivo de tipos conserva declarações puras; não força ciclo nem tipos mais fracos para cumprir um formato.                                           |
| D3      | `ConfirmDialog` justificava divisão mesmo com exportação única: estado/orquestração na raiz e views de bloqueio versus confirmação/falha transitória separadas. As views não ganhavam fetch ou estado de negócio.    |
| D4      | O auxiliar curto `useComboboxAnchor` ficava junto da raiz; arquivo próprio sem ganho de leitura foi rejeitado. Sua existência não é exigência para versões posteriores do combobox.                                  |
| D5–D7   | Mover testes públicos e ajustar imports relativos e exclusões preservava o contrato da reorganização, sem revisão funcional incidental.                                                                              |
| D8      | A skill procurada no subprojeto foi localizada em `.claude/skills/agenza-ui-primitive/` da raiz do monorepo. O impedimento de localização foi resolvido, não era tarefa ainda pendente.                              |
| D9      | A pasta de nível superior passou a cobrir também componentes atômicos, por previsibilidade; tipos e subpartes continuaram condicionados a conteúdo real.                                                             |
| D10     | Revisão reduziu segregação excessiva: wrappers triviais juntos em `<nome>-primitives.tsx`, partes relevantes isoladas por julgamento qualitativo. Foi também tentada a volta dos atômicos a arquivos planos.         |
| D11     | A tentativa de arquivos planos para atômicos foi revertida por escolha de uniformidade. Mantiveram-se pastas universais e o agrupamento de triviais de D10; isso não reabriu a divisão interna já corrigida.         |

Foram rejeitados arquivo de tipos vazio, arquivo individual para cada wrapper e um limiar numérico de
linhas para decidir separação. O custo considerado era navegação e legibilidade, e não reduzir ou
maximizar a contagem de arquivos.

## Evidência e evolução posterior

- O checkpoint `5099b388` contém os artefatos desta spec e a estrutura já migrada. Ele comprova sua
  presença naquele estado; não foi identificado no histórico disponível um PR isolado da migração.
- Na base `38d2dbd9`, [button](../../src/shared/ui/button/index.tsx),
  [dialog](../../src/shared/ui/dialog/index.tsx),
  [input-group](../../src/shared/ui/input-group/index.tsx) e suas subpartes exemplificam a organização.
  O [teste do input-group](../../src/shared/ui/input-group/input-group.test.tsx) continua junto da peça.
- `ConfirmDialog` passou a [widgets](../../src/widgets/confirm-dialog/index.tsx); `card` e `separator`
  foram removidos por falta de consumidor em `6a8e5fb6` (PR #186). Partes do combobox e tipos foram
  alterados depois. Essas evoluções não tornam a migração uma pendência nem exigem restaurar o antigo
  inventário de símbolos.
- O [Vitest](../../vitest.config.ts) demonstra as exclusões atuais; os caminhos e motivos não devem
  ser inferidos de tabelas históricas. O [guia vigente](../../docs/ARCHITECTURE.md) e a
  [skill](../../../../.claude/skills/agenza-ui-primitive/SKILL.md) possuem a orientação de manutenção.

Não há modelo de domínio ou contrato HTTP próprio desta migração. O antigo mapeamento arquivo por
arquivo, checklists e roteiro de execução duplicavam a fonte e o aceite; as decisões exclusivas ficam
acima. Preparação e comandos de verificação estão no [README](../../README.md).
