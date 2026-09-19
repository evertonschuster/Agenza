# Feature Specification: Pastas por Componente Composto em shared/ui

**Feature Branch**: `005-shared-ui-component-folders`

**Created**: 2026-09-16

**Status**: Draft

**Input**: User description: "Quero que você me ajude a reorganizar os componentes na pasta
D:\Agenza\apps\admin-frontend\src\shared\ui para que organismos possua um parque para cada
componente, né? obviamente os seus dependentes, e que a gente possa segregar, então, componentes em
componentes menores, internos, da pasta components, e também na raiz da pasta componente tem o
arquivo de TypeScript, que define apenas os tipos para aquele determinado componente. É, facilitando
assim a organização, a legibilidade, depois para de criar muitos componentes internos ou fazer um
contexto com aquele mesmo componente sem ter que deparar todo o mesmo arquivo TypeScript React."

## Clarifications

### Session 2026-09-16

- Q: Quando um teste hoje colocalizado (`confirm-dialog.test.tsx`, `input-group.test.tsx`) se move
  para a nova pasta do componente, o nível de granularidade do teste muda, ou continua testando a API
  pública como um todo? → A: Continua um único arquivo de teste por componente, na raiz da pasta,
  testando a API pública como um todo — mesma granularidade de hoje, só migrado de lugar.
- Q: Qual regra decide se um componente de exportação única (não composto) ainda se qualifica para a
  nova estrutura em pasta por ser "complexo o bastante", como o caso do `confirm-dialog.tsx`? → A:
  Qualitativo, decidido em revisão de código, caso a caso — sem limiar numérico fixo (linhas ou
  quantidade de tipos), mesmo padrão de julgamento já usado no registro de decisões D5 de
  `docs/ARCHITECTURE.md`.
- Q: Onde o padrão de pastas por componente (FR-010) deve ficar documentado, para uma pessoa
  desenvolvedora encontrar ao adicionar um novo componente composto no futuro? → A:
  `docs/ARCHITECTURE.md` como fonte da verdade (mesmo lugar que já documenta o padrão análogo de
  páginas em §1, e a tabela de decisões em §5), e a skill `agenza-ui-primitive` atualizada para apontar
  para lá — consistente com "aponta, não copia" (AGENTS.md deste app).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Alterar uma sub-parte de um componente composto sem abrir o arquivo inteiro (Priority: P1)

Uma pessoa desenvolvedora precisa alterar ou revisar apenas uma sub-parte de um componente composto de
`shared/ui` (por exemplo, um item da lista do combobox, ou o cabeçalho de um diálogo). Hoje isso exige
abrir um único arquivo que mistura a raiz do componente com todas as suas sub-partes e os tipos
derivados do primitivo por trás dele — alguns desses arquivos já passam de 300 linhas e 15 exports.
Depois desta mudança, cada sub-parte interna vive em seu próprio arquivo dentro de `components/`,
dentro da pasta do componente.

**Why this priority**: É a dor concreta que motivou o pedido — hoje, para mexer em uma única
sub-parte ou acrescentar mais uma, é preciso lidar com o arquivo inteiro do componente. Resolver isso
primeiro já entrega o benefício principal, mesmo antes de qualquer outra melhoria de organização.

**Independent Test**: Abrir a pasta de qualquer componente restruturado (ex. `combobox/`) e confirmar
que cada sub-parte interna está em seu próprio arquivo dentro de `components/`, localizável pelo nome
da sub-parte, sem precisar abrir um arquivo que também contenha as demais sub-partes não relacionadas.

**Acceptance Scenarios**:

1. **Given** o componente `combobox` já foi restruturado, **When** uma pessoa desenvolvedora precisa
   alterar apenas `ComboboxChip`, **Then** ela abre um arquivo dedicado a essa sub-parte, sem que as
   outras sub-partes do combobox apareçam no mesmo arquivo.
2. **Given** uma pessoa desenvolvedora abre a raiz da pasta de um componente restruturado, **When**
   ela olha os arquivos ali, **Then** encontra apenas o ponto de entrada público do componente e o
   arquivo de tipos — nenhuma sub-parte interna solta na raiz.

---

### User Story 2 — Ler o contrato de tipos de um componente sem abrir a implementação (Priority: P2)

Uma pessoa desenvolvedora quer saber quais props um componente composto aceita. Hoje os tipos ficam
intercalados com JSX, classes de estilo e lógica de renderização no mesmo arquivo do componente. Depois
desta mudança, cada componente restruturado tem um arquivo próprio, na raiz da sua pasta, que define
somente os tipos daquele componente.

**Why this priority**: Depende da pasta por componente já existir (User Story 1), mas é um benefício
adicional e independente — melhora a legibilidade do contrato mesmo para quem só consome o componente,
sem precisar alterá-lo.

**Independent Test**: Abrir somente o arquivo de tipos de um componente restruturado e confirmar que
todo prop/tipo usado pela API pública dele está ali, sem nenhum JSX ou classe de estilo misturado.

**Acceptance Scenarios**:

1. **Given** o componente `confirm-dialog` já foi restruturado, **When** uma pessoa desenvolvedora
   abre apenas o arquivo de tipos dele, **Then** encontra `ConfirmDialogProps` e os demais tipos
   relacionados, sem nenhuma linha de JSX ou de implementação.
2. **Given** uma pessoa desenvolvedora precisa alterar um tipo usado tanto pelo ponto de entrada
   quanto por uma sub-parte interna, **When** ela edita apenas o arquivo de tipos, **Then** a mudança
   vale para os dois, sem definição duplicada do mesmo tipo em mais de um lugar.

---

### User Story 3 — Adicionar um novo componente composto seguindo um padrão já definido (Priority: P3)

Uma pessoa desenvolvedora precisa adicionar um novo componente composto a `shared/ui` (à mão ou via CLI
do shadcn). Depois desta mudança, existe um padrão documentado e já exemplificado por múltiplos
componentes reais — pasta própria, ponto de entrada, arquivo de tipos, `components/` para sub-partes —
que ela segue sem precisar reinventar a estrutura nem esperar o mesmo arquivo crescer 300 linhas de
novo antes de ser reorganizado.

**Why this priority**: É o valor de longo prazo do pedido — evitar que o problema resolvido nas User
Stories 1 e 2 volte a se formar. Depende das duas anteriores estarem resolvidas para servir de exemplo
real a seguir.

**Independent Test**: Uma pessoa desenvolvedora que não participou desta mudança consegue montar a
estrutura de um novo componente composto (pasta, ponto de entrada, arquivo de tipos, `components/`)
apenas lendo a convenção documentada, sem perguntar a outra pessoa da equipe.

**Acceptance Scenarios**:

1. **Given** a convenção documentada por esta feature, **When** uma pessoa desenvolvedora cria um novo
   componente composto, **Then** o resultado tem pasta própria, ponto de entrada, arquivo de tipos e
   (se houver sub-partes) uma pasta `components/`, no mesmo formato dos componentes já restruturados.
2. **Given** um componente novo que ainda não tem nenhuma sub-parte interna, **When** ele é criado,
   **Then** nenhuma pasta `components/` vazia é criada por antecipação — ela só aparece quando uma
   sub-parte real existir, mesma regra já usada hoje para páginas de feature.

---

### Edge Cases

- O que acontece com um componente que hoje exporta um único componente, mas já é complexo (ex.
  `confirm-dialog.tsx`, com 5 declarações de tipo e dois ramos de renderização condicional)? Ele ganha
  `components/` mesmo exportando um único componente — o critério do FR-004 é a complexidade do
  arquivo, não a quantidade de exports.
- O que acontece com um componente de exportação única e sem tipo próprio (ex. `button.tsx`, que só
  repassa `React.ComponentProps` além de uma variante `cva` que fica com ele)? Ganha pasta própria
  (FR-001) com só `index.tsx` — nem `components/` (FR-004 não se aplica), nem `<nome>.types.ts` (FR-002
  não se aplica, não há tipo próprio para extrair).
- O que acontece com os testes hoje colocalizados junto do componente (`confirm-dialog.test.tsx`,
  `input-group.test.tsx`)? Eles se movem junto para a raiz da nova pasta do componente, como um único
  arquivo testando a API pública como um todo — não são divididos em um arquivo por sub-parte dentro
  de `components/` (ver Clarifications, sessão 2026-09-16).
- O que acontece se, depois da reorganização, alguém rodar de novo o comando do CLI do shadcn
  (`npx shadcn add <componente>`) sobre um componente já restruturado? O CLI escreve num arquivo plano
  em `shared/ui/<nome>.tsx`, conforme `components.json` — ele não conhece a nova estrutura em pasta.
  Isso é uma limitação aceita, não algo que esta feature resolve; regenerar um componente restruturado
  continua exigindo reaplicar manualmente o que o CLI escreveu, do mesmo jeito que qualquer
  customização sobre um componente gerado já exige hoje.
- O que acontece com a entrada de um componente restruturado na lista de exclusão de cobertura
  (`vitest.config.ts`)? A entrada é atualizada para o novo caminho, preservando o status atual
  (excluído ou incluído) e o motivo já documentado — nenhum componente muda de status de cobertura
  como efeito colateral de virar pasta.
- O que acontece com os arquivos que hoje importam algum desses componentes (ex.
  `@/shared/ui/combobox`, `@/shared/ui/dialog`)? Continuam importando do mesmo caminho, sem nenhuma
  alteração — ver FR-005.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A reorganização **DEVE** dar uma pasta própria a todo componente de `src/shared/ui/`, sem
  exceção. O critério do FR-004 (exporta mais de um componente fortemente acoplado, **OU** um único
  componente complexo o bastante) decide se, dentro dessa pasta, existe uma subpasta `components/`
  (FR-003); ter pelo menos um tipo próprio real para extrair (mesmo critério do FR-002) decide se existe
  `<nome>.types.ts`. Um componente de exportação única, sem tipo próprio e sem essa complexidade, ainda
  ganha pasta — só que com nada além de `index.tsx` dentro — **revisado duas vezes em 2026-09-17**: a
  versão original desta FR dava pasta a todo componente sem exceção; uma primeira revisão (research.md
  D10) restringiu a pasta aos componentes que se qualificassem por FR-004 ou FR-002, deixando sete
  componentes puramente atômicos (`badge`, `button`, `input`, `label`, `separator`, `skeleton`,
  `textarea`) como arquivo único; uma segunda revisão no mesmo dia (research.md D11) reverteu essa
  restrição — pasta volta a ser universal, porque a inconsistência de ter 7 componentes fora do padrão
  dos outros 13 pesou mais do que evitar uma pasta de um arquivo só.
- **FR-002**: Uma pasta de componente **DEVE** ter, na sua raiz, um `index.tsx` como ponto de entrada
  público — sempre presente numa pasta que existe. Um arquivo `<nome>.types.ts`, só com os tipos
  daquele componente (sem JSX, sem lógica de renderização, sem classes de estilo), existe **sempre que
  houver pelo menos um tipo próprio real para extrair** — essa condição, junto com a do FR-004, decide o
  que existe **dentro** da pasta (que agora é sempre criada, FR-001), não se a pasta existe. Quando o
  componente só repassa `React.ComponentProps<'x'>` adiante, ou seu único tipo vem de uma variante `cva`
  que permanece junto do componente, não há `<nome>.types.ts`.
- **FR-003**: Uma pasta de componente que se qualifica pelo critério do FR-004 **DEVE** ter uma
  subpasta `components/` contendo as sub-partes internas/dependentes com peso real — composição de
  outros componentes, estado/handler/ref próprios, ou lógica condicional/classe longa o bastante para
  merecer isolamento. Sub-partes sem esse peso (wrapper de um único elemento primitivo, classe estática
  ou puramente orientada por seletor CSS, sem composição, sem condicional em JS) **NÃO DEVEM** ganhar um
  arquivo cada — ficam agrupadas num único `components/<nome>-primitives.tsx` — **revisado em
  2026-09-17**: a versão anterior desta FR dava um arquivo a cada sub-parte sem exceção, o que produziu
  19 arquivos de ≤10 linhas (a maioria com exatamente 7) para wrappers de uma linha como
  `DialogPortal`/`DialogTrigger`/`ComboboxValue`.
- **FR-004**: Um componente se qualifica pelo critério acima (FR-003) quando exporta mais de
  um componente fortemente acoplado (ex. uma raiz mais Trigger/Content/Item), **OU** quando um único
  componente exportado tem lógica de renderização e superfície de tipos complexas o bastante para
  prejudicar a leitura em arquivo único (ex. múltiplos ramos condicionais, múltiplas declarações de
  tipo). Essa segunda condição é avaliada qualitativamente em revisão de código, caso a caso — **NÃO
  HÁ** limiar numérico fixo (nem de linhas, nem de quantidade de tipos), mesmo padrão de julgamento já
  usado no registro de decisões D5 de `docs/ARCHITECTURE.md`.
- **FR-005**: A reorganização **NÃO DEVE** alterar nenhum caminho de import hoje usado por
  consumidores fora de `shared/ui` (ex. `@/shared/ui/combobox`, `@/shared/ui/dialog`) — todo consumidor
  externo continua importando do mesmo caminho, sem mudança de comportamento.
- **FR-006**: Uma sub-parte dentro da subpasta `components/` de um componente **NÃO DEVE** ser
  importada diretamente de fora da pasta daquele componente — o acesso é sempre pelo ponto de entrada
  público da pasta.
- **FR-007**: Teste automatizado hoje colocalizado com um componente restruturado **DEVE** se mover
  para a raiz da nova pasta desse componente, como um único arquivo testando a API pública como um
  todo, continuando a passar sem mudança de comportamento — **NÃO DEVE** ser dividido em um arquivo de
  teste por sub-parte interna dentro de `components/` como parte desta feature.
- **FR-008**: A reorganização **DEVE** preservar, para cada componente restruturado, o status atual
  dele no gate de cobertura (`vitest.config.ts`) — incluído ou excluído, e o motivo já documentado —
  atualizando a configuração para os novos caminhos em vez de deixar o status mudar como efeito
  colateral.
- **FR-009**: A reorganização **NÃO DEVE** alterar a saída visual, o contrato de props ou o
  comportamento em tempo de execução de nenhum componente restruturado — é uma mudança de organização
  de arquivos, não de comportamento.
- **FR-010**: Esta feature **DEVE** deixar documentado o padrão (quando um componente se qualifica, o
  que vai na raiz, o que vai em `components/`, onde ficam os tipos) em `docs/ARCHITECTURE.md` — fonte
  da verdade, no mesmo lugar que já documenta o padrão análogo de páginas (§1) e a tabela de decisões
  (§5) — e a skill `agenza-ui-primitive` **DEVE** ser atualizada para apontar para essa entrada, em vez
  de duplicar a convenção, para que uma pessoa desenvolvedora consiga aplicá-la a um componente novo
  sem re-derivar a estrutura.

### Non-Functional Requirements

- **NFR-001**: Nenhuma regressão nos portões de CI existentes (`tsc`, ESLint, Prettier, cobertura,
  `generate:api-types:check`, Playwright).
- **NFR-002**: Nenhuma mudança de comportamento observável em nenhuma tela que consome algum desses
  componentes — a reorganização é invisível para quem usa o produto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Toda sub-parte interna de um componente restruturado é localizável em um arquivo próprio
  dentro de `components/`, identificável pelo nome da sub-parte, sem abrir nenhum arquivo que também
  contenha sub-partes não relacionadas.
- **SC-002**: O contrato de tipos de qualquer componente restruturado pode ser lido inteiramente a
  partir de um único arquivo, sem abrir o arquivo de implementação.
- **SC-003**: Depois da reorganização, a suíte completa de portões de CI (tipo, lint, formatação,
  cobertura, drift de tipos gerados, Playwright) passa sem nenhuma alteração fora de `src/shared/ui/`,
  além da própria lista de exclusão de cobertura.
- **SC-004**: 100% dos componentes de `shared/ui/` têm pasta própria (FR-001), sem exceção. Dentro
  dessas pastas, 100% dos que se enquadram no critério do FR-004 têm subpasta `components/`, e 100% dos
  que têm tipo próprio real têm `<nome>.types.ts`; os demais ficam só com `index.tsx`. Dentro de
  `components/`, 100% das sub-partes com peso real (composição, estado, condicional) têm arquivo
  próprio; as triviais ficam agrupadas num único `<nome>-primitives.tsx` por componente, nunca uma por
  arquivo.
- **SC-005**: Nenhum dos consumidores hoje existentes desses componentes precisa de qualquer alteração
  além de, no máximo, recompilar — nenhum caminho de import muda.

## Assumptions

- **Todo componente ganha pasta** (FR-001), sem exceção — 20 no total. O que varia é o conteúdo dentro
  dela: `avatar`, `card`, `kbd` (exporta `Kbd` + `KbdGroup` — mesma forma de `avatar`/`card`, corrigido
  em 2026-09-17 após classificação inicial errada), `badge`, `button`, `input`, `label`, `separator`,
  `skeleton` e `textarea` — 10 no total — não se qualificam nem pelo FR-004 nem pelo FR-002, então têm
  só `index.tsx`. `color-swatch-picker` e `FullScreenMessage` têm tipo próprio real (FR-002) mas não se
  qualificam pelo FR-004, então têm `index.tsx` + `<nome>.types.ts`, sem `components/`. `combobox`,
  `confirm-dialog`, `dialog`, `dropdown-menu`, `input-group`, `sheet`, `toast` e `tooltip` — 8 no total —
  se qualificam pelo FR-004 e ganham `components/` (mais `<nome>.types.ts` quando também há tipo próprio
  real). Esta lista é ilustrativa do estado atual, não um teto fixo.
  **Histórico**: a versão original desta feature já dava pasta a todo componente sem exceção
  (research.md D9); uma revisão em 2026-09-17 (research.md D10) restringiu a pasta aos 13 que se
  qualificavam por FR-004 ou FR-002, deixando os outros 7 como arquivo único; uma segunda revisão no
  mesmo dia (research.md D11) reverteu essa restrição de volta à regra original, porque a inconsistência
  visível de 7 componentes fora do padrão dos outros 13 pesou mais do que evitar uma pasta de um arquivo
  só.
- A subpasta `components/` só é criada quando o componente se qualifica pelo FR-004 **e**, dentro
  dela, só a sub-parte com peso real (composição de outros componentes, estado/handler/ref próprios,
  ou condicional em JS) ganha arquivo próprio — mesma regra já aplicada a páginas de feature em
  `docs/ARCHITECTURE.md` §1 ("Sub-components go in a `components/` subfolder, created only when a page
  actually grows them"), agora também aplicada dentro de cada componente e não só entre eles. Sub-partes
  triviais (wrapper de um elemento, classe estática ou orientada por seletor CSS, sem composição, sem
  condicional em JS) ficam juntas num único `<nome>-primitives.tsx`. **Histórico**: a versão anterior
  desta regra dava um arquivo a cada sub-parte sem essa distinção, produzindo 19 arquivos de ≤10 linhas
  — corrigido em 2026-09-17, mesmo dia, depois de revisão.
- O `<nome>.types.ts` do FR-002 só é criado quando há um tipo próprio real para extrair — mesma lógica
  do item acima, aplicada ao arquivo de tipos em vez de a `components/`. Dos 9 componentes hoje
  atômicos, `color-swatch-picker` (`ColorSwatchOption`, `ColorSwatchPickerProps`) e
  `FullScreenMessage` (props de título/descrição/ação) têm tipo próprio real e ganham o arquivo; os
  outros 7 (`badge`, `button`, `input`, `label`, `separator`, `skeleton`, `textarea`) só repassam
  `React.ComponentProps<'x'>` ou uma variante `cva` que já fica com o componente (ver o próximo item) —
  esses ficam só com `index.tsx`, sem `types.ts`.
- O arquivo de tipos é nomeado `<nome-do-componente>.types.ts`, seguindo o kebab-case já usado nos
  arquivos atuais (ex. `confirm-dialog.types.ts`, `input-group.types.ts`). Uma chamada `cva()` (ex.
  `badgeVariants`, `buttonVariants`) nunca vai para esse arquivo — fica junto do componente que a usa,
  porque `cva()` é lógica de estilo em tempo de execução, não um tipo (mesma regra que já vale para os
  componentes compostos).
- O ponto de entrada público de cada pasta é um arquivo `index`, preservando os caminhos de import
  atuais (`@/shared/ui/<nome>`) sem exigir alteração em nenhum dos consumidores existentes. Isso inclui
  `FullScreenMessage/`, que mantém a grafia exata de hoje (PascalCase, a única exceção ao kebab-case
  entre os arquivos de `shared/ui/`) — corrigir essa inconsistência de nome não é parte desta feature
  (mudaria o caminho de import, violando FR-005) e fica como um item separado, se for o caso.
- Regenerar um componente restruturado via `npx shadcn add` deixa de escrever diretamente na estrutura
  em pasta, porque `components.json` aponta para o caminho plano `@/shared/ui`; isso já é uma
  limitação aceita hoje para qualquer customização sobre um componente gerado, e esta feature não
  precisa resolvê-la.
- A lista de exclusão de cobertura em `vitest.config.ts` é atualizada como parte desta feature para
  refletir os novos caminhos, sem mudar o status (incluído/excluído) nem o motivo já documentado de
  nenhum componente. Das 16 entradas hoje existentes para `shared/ui/`, todas as 16 viram glob de pasta
  (`<nome>/**`) — incluindo `badge`, `button`, `input`, `label`, `separator`, `skeleton` e `textarea`,
  que numa revisão intermediária (research.md D10) chegaram a apontar para o arquivo exato, mas voltaram
  a glob de pasta quando a revisão seguinte (research.md D11) reverteu essa restrição.

## Out of Scope

- Mudar o design visual, o comportamento ou o contrato de props de qualquer componente existente.
- Adicionar, remover ou trocar qualquer componente ou dependência (Base UI, ícones, etc.).
- Resolver a limitação da CLI do shadcn não escrever diretamente na nova estrutura em pasta.
- Normalizar a grafia de `FullScreenMessage.tsx` para kebab-case — a pasta nova mantém o nome exato de
  hoje (ver Assumptions).
- Mudar a convenção de nomes de arquivo já usada em `features/*/ui/pages/` — esta feature cobre apenas
  `shared/ui`.
