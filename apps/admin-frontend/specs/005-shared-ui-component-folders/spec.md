# Spec 005 — Pastas de componentes de UI

**Estado:** reorganização implementada; registro histórico, com componentes posteriormente removidos
ou movidos. **Criada em:** 16/09/2026. **Identificador:** `005-shared-ui-component-folders`.

Os artefatos e a estrutura já constavam no checkpoint `5099b388`. Na base `38d2dbd9`, pastas como
`button/`, `dialog/` e `input-group/`, seus pontos públicos e subpartes demonstram a reorganização.
O histórico consultado não identifica um PR isolado de implantação desta spec. O [plano](plan.md)
registra as alternativas e os limites dessa evidência; [tasks](tasks.md) encerra a lista histórica.

Este documento conserva o aceite da migração, sem impor que cada componente ou teste existente hoje
repita exatamente sua composição da época. A orientação vigente está na
[arquitetura do frontend](../../docs/ARCHITECTURE.md).

## Objetivo e escopo histórico

Permitir localizar uma parte relevante de um componente e ler seu contrato sem navegar por um único
arquivo que mistura raiz, tipos e todas as subpartes. A mudança era de organização de fonte: preservar
imports públicos, props, aparência, comportamento e posição de cada componente no gate de cobertura.
Não acrescentava funcionalidade, dependência ou superfície de execução.

## Histórias e cenários de aceite

### US1 — Localizar e alterar uma subparte (P1)

1. Uma parte relevante, como o `ComboboxChip` usado no exemplo original, tem arquivo identificável em
   `components/`, sem obrigar a abrir as outras partes. O exemplo é histórico; não exige restaurar
   uma peça posteriormente retirada do produto.
2. A raiz da pasta separa ponto público e tipos próprios de suas subpartes; testes colocados junto
   podem permanecer nessa raiz.

### US2 — Ler o contrato de tipos (P2)

1. Abrir o arquivo próprio de tipos de um componente que o tenha permite ler suas props sem JSX,
   classes de estilo ou lógica de implementação.
2. Um tipo compartilhado entre raiz e subparte tem uma definição, usada pelas duas, sem cópia.

### US3 — Aplicar uma convenção reconhecível (P3)

1. Um componente composto novo pode seguir os exemplos e a convenção documentada, sem nova decisão
   sobre onde localizar raiz, contrato e subpartes.
2. Uma peça sem subpartes não ganha `components/` vazio nem um arquivo de tipos artificial.

## Requisitos registrados

- **FR-001:** cada componente coberto pela migração ganha pasta própria, inclusive o atômico que
  fique somente com `index.tsx`. A regra universal foi a escolha final após as revisões do plano.
- **FR-002:** `index.tsx` mantém o ponto público; `<nome>.types.ts` existe quando há tipo próprio real,
  sem JSX, runtime ou estilo. Encaminhar somente um tipo do primitivo ou derivar `VariantProps` não
  obriga criar arquivo próprio.
- **FR-003:** subpartes com composição, estado/handler/ref ou renderização/estilo que justifiquem
  isolamento ficam em arquivos próprios de `components/`. Wrappers triviais do mesmo componente ficam
  agrupados em `<nome>-primitives.tsx`, sem um arquivo por trivialidade.
- **FR-004:** o critério é qualitativo em revisão: partes acopladas ou uma única exportação complexa
  podem justificar divisão. Não há limiar fixo de linhas ou quantidade de tipos/exports.
- **FR-005:** consumidores externos mantêm o mesmo caminho público e símbolos exportados.
- **FR-006:** subpartes não são importadas diretamente de fora da pasta; a entrada pública medeia o
  acesso. A migração não acrescentou check automático específico para esse limite.
- **FR-007:** testes colocados junto migram para a raiz da pasta, continuando a exercitar a API pública
  sem reescrita das asserções nem divisão por subparte como parte desta entrega. Isso não proíbe testes
  internos posteriores quando outra mudança os justifique.
- **FR-008:** o ajuste dos caminhos de cobertura preserva inclusão/exclusão e seu motivo; mover para
  pasta não concede isenção a todo `shared/ui/`.
- **FR-009:** a migração não modifica props, saída visual ou comportamento de runtime.
- **FR-010:** registrar a convenção em `docs/ARCHITECTURE.md` e fazer a skill `agenza-ui-primitive`
  apontar para a orientação, sem manter uma segunda versão normativa.
- **NFR-001:** preservar os gates de qualidade existentes, sem reduzir limiares para acomodar a mudança.
- **NFR-002:** nenhuma mudança observável nas telas consumidoras como efeito da reorganização.

## Critérios de sucesso históricos

- **SC-001:** cada subparte relevante é localizável em seu arquivo; wrappers triviais podem ser lidos
  juntos sem misturar componentes independentes.
- **SC-002:** os tipos próprios extraídos permitem ler o contrato sem abrir sua implementação;
  tipos derivados diretamente de primitivas ou `cva` continuam com a peça correspondente.
- **SC-003:** os gates continuam passando sem mudança funcional fora de `shared/ui/`. As exceções de
  escopo eram a adaptação de caminhos de cobertura e a documentação exigida por FR-010.
- **SC-004:** todos os componentes do escopo recebem pasta; apenas os que possuem conteúdo real
  recebem `components/` ou arquivo de tipos, com triviais agrupados.
- **SC-005:** nenhum consumidor precisa alterar seu import para continuar usando a mesma API pública.

Esses critérios descrevem o aceite da migração, não resultados de uma execução neste saneamento.

## Restrições e exclusões preservadas

- `FullScreenMessage` manteve a grafia da pasta porque normalizar para kebab-case quebraria imports.
- `cva()` e seus tipos derivados ficam com a peça que os usa; movê-los para o arquivo de tipos
  introduziria runtime nele e poderia criar dependência circular.
- Gerar novamente pela CLI pode produzir arquivo plano. A migração aceitou a reaplicação manual na
  estrutura local, sem criar mecanismo de geração próprio.
- Partes triviais, tipos vazios e diretórios vazios não eram entregáveis por si mesmos.
- Não se alteravam nomes de arquivos das páginas de feature, contratos de componentes, dependências
  nem o comportamento de tenant/autenticação. Não se adicionavam testes de partes inalteradas apenas
  para corresponder à nova quantidade de arquivos.
