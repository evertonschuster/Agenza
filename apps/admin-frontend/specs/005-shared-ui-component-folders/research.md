# Phase 0 Research: Pastas por Componente Composto em shared/ui

Sem `NEEDS CLARIFICATION` pendente no Technical Context do plan.md — todo campo foi preenchido
diretamente a partir do `package.json`, do código-fonte atual de cada componente e de
`docs/ARCHITECTURE.md`. As decisões abaixo cobrem, em vez disso, as questões de desenho que a spec
deixou para o plano (por ser HOW, não WHAT) e que precisam de uma resposta única antes de escrever
`data-model.md`.

## D1 — O que é "raiz" e o que é "dependente" dentro de cada componente

**Decision**: O componente cujo nome casa com o nome do arquivo/pasta atual (ex. `Combobox` dentro de
`combobox.tsx`, `Toast`+`Toaster` dentro de `toast.tsx`) é a raiz e vive em `index.tsx`. Todo outro
símbolo hoje exportado lado a lado é um dependente e ganha seu próprio arquivo em `components/`,
nomeado em kebab-case a partir do próprio nome (`ComboboxChip` → `components/combobox-chip.tsx`).
`index.tsx` reexporta cada um desses arquivos, então o conjunto de símbolos importável de
`@/shared/ui/<nome>` não muda (FR-005).

**Rationale**: É a única regra que não exige julgamento por componente — aplica igual aos 11 hoje
identificados, incluindo o caso ambíguo de `toast.tsx` (duas raízes plausíveis: `Toast`, o wrapper fino
do primitivo, e `Toaster`, a composição pronta para uso — as duas ficam em `index.tsx`, já que ambas são
consumidas de fora hoje, e só `ToastProvider`/`ToastPortal`/`ToastViewport`/`ToastContent`/
`ToastTitle`/`ToastDescription`/`ToastAction`/`ToastClose`/`ToastIcon`/`ToastList` vão para
`components/`).

**Alternatives considered**: Definir "raiz" como "o único componente sem prop de composição" — descartado
por exigir análise caso a caso sem ganho sobre a regra de nome, e por não ter resposta clara para
`toast` (nem `Toast` nem `Toaster` se encaixaria sozinho).

## D2 — Onde ficam as variantes `cva()`

**Decision**: Uma chamada `cva(...)` (ex. `inputGroupAddonVariants`, `inputGroupButtonVariants` em
`input-group.tsx`) e o tipo `VariantProps<typeof ...>` derivado dela ficam **junto do componente que a
usa**, dentro de `components/<sub-parte>.tsx` — nunca em `<nome>.types.ts`. O arquivo de tipos guarda só
declarações de tipo puras (interface/type) que não dependem de um valor em tempo de execução definido em
outro arquivo.

**Rationale**: `cva()` produz uma função (valor de runtime), não um tipo — colocá-la no arquivo de
tipos violaria a própria regra que motivou o pedido (FR-002: "sem lógica de renderização... sem classes
de estilo") e criaria uma dependência de `components/` → arquivo de tipos → `components/` de volta
(o tipo precisaria importar a função de dentro de `components/` para derivar `VariantProps`), invertendo
a direção natural (raiz/tipos não deveriam depender de um arquivo dentro de `components/`).

**Alternatives considered**: Mover todo `cva()` do componente para `<nome>.types.ts` mesmo assim —
descartado por misturar runtime com tipos no mesmo arquivo, exatamente o problema que a feature busca
resolver, só que movido de lugar em vez de resolvido.

## D3 — `confirm-dialog`: como dividir um componente de exportação única

**Decision**: As 5 declarações de tipo (`ConfirmDialogFailure`, `ConfirmDialogConfirmation`,
`ConfirmDialogError`, `ConfirmDialogSuccess`, `ConfirmDialogProps<T>`) vão para
`confirm-dialog.types.ts`. Os dois ramos de renderização condicional (estado bloqueado vs. estado de
confirmação/falha passageira) viram dois componentes internos —
`components/confirm-dialog-blocked-view.tsx` e `components/confirm-dialog-confirm-view.tsx` — cada um
recebendo como props só o que aquele ramo usa hoje. `index.tsx` mantém o `useState` duplo
(`isSubmitting`, `failure`) e `handleConfirm`, e escolhe qual view renderizar.

**Rationale**: São exatamente os dois motivos citados nos Edge Cases da spec para `confirm-dialog` se
qualificar pela cláusula qualitativa do FR-004 — resolver os dois ao mesmo tempo prova o critério em vez
de só citá-lo. Nenhuma mudança de comportamento: as duas views continuam recebendo os mesmos dados
já calculados (`failure`, `isSubmitting`), sem passar a ter fetcher, toast ou estado próprio (preserva a
decisão já registrada em D6/`docs/ARCHITECTURE.md` §5 de que o componente é só apresentacional).

**Alternatives considered**: Manter as duas views inline em `index.tsx` e restruturar só os tipos —
rejeitado por deixar a maior fonte de complexidade (o JSX condicional de 45 linhas) exatamente onde
estava, contradizendo o motivo pelo qual `confirm-dialog` entrou na lista de componentes qualificados.

## D4 — O hook `useComboboxAnchor`

**Decision**: Fica exportado diretamente em `combobox/index.tsx`, ao lado de `Combobox`, em vez de
ganhar um arquivo próprio em `components/`.

**Rationale**: É uma função de uma linha (`() => React.useRef<HTMLDivElement | null>(null)`), pública
hoje, sem sub-partes ou tipos próprios — dar-lhe um arquivo dedicado não reduziria nada em legibilidade
(FR-003 fala de "sub-partes", e um hook auxiliar de uma linha não é uma sub-parte de UI).

**Alternatives considered**: `components/use-combobox-anchor.ts` — descartado por criar um arquivo de
uma linha sem ganho de organização mensurável; revisitar apenas se o hook crescer.

## D5 — Testes colocalizados: caminho de import após a migração

**Decision**: `confirm-dialog.test.tsx` e `input-group.test.tsx` migram para a raiz da nova pasta
(`confirm-dialog/confirm-dialog.test.tsx`, `input-group/input-group.test.tsx` — resolvido em
Clarifications, sessão 2026-09-16) e trocam seu import relativo hoje (`from './confirm-dialog'`,
`from './input-group'`) para `from '.'` (o `index.tsx` da própria pasta), em vez de
`from './index'` ou de repetir o nome do componente.

**Rationale**: `from '.'` é a forma mais curta e a que melhor expressa "isto testa a API pública desta
pasta", coerente com FR-005 (o caminho externo `@/shared/ui/<nome>` também resolve para o mesmo
`index.tsx`) — o teste importa o componente do mesmo jeito que um consumidor externo importaria, só que
por caminho relativo.

**Alternatives considered**: `from './index'` — funcionalmente idêntico, só mais verboso; sem motivo
para preferir.

## D6 — Imports relativos existentes que mudam de profundidade

**Decision**: Dois imports relativos hoje dentro de `confirm-dialog.tsx` precisam de ajuste porque o
arquivo passa a viver uma pasta mais fundo (`shared/ui/confirm-dialog.tsx` → `shared/ui/confirm-dialog/index.tsx`):
- `from '../api/servicesFacade'` → `from '../../api/servicesFacade'` (sobe de `confirm-dialog/` para
  `ui/` e depois para `shared/`, em vez de só para `ui/`).
- `from './toast'` → `from '../toast'` (toast agora é uma pasta irmã de `confirm-dialog/`, ambas dentro
  de `shared/ui/`, mas o arquivo que faz o import está um nível mais fundo do que estava).

Nenhum outro import relativo existe hoje dentro de `shared/ui/` (verificado por busca em todo o
diretório) — todo outro consumo entre componentes de `shared/ui/` já usa o alias absoluto
`@/shared/ui/<nome>` (ex. `combobox.tsx` importando `input-group` hoje), que continua resolvendo sem
alteração por causa do FR-005.

**Rationale**: `tsc` pega qualquer caminho relativo errado como erro de compilação — listar os dois
casos existentes agora evita que a migração dependa de descobrir isso só quando o build quebrar.

## D7 — `vitest.config.ts`: de caminho de arquivo para glob de pasta

**Decision**: **Todas as 16 entradas** de `coverage.exclude` hoje escritas como arquivo exato para
`shared/ui/` — as 11 do grupo "presentational cva wrappers" (`avatar`, `badge`, `button`, `card`,
`input`, `kbd`, `label`, `separator`, `skeleton`, `textarea`, `FullScreenMessage`), a de `dialog`
("no consumer"), e as 4 do grupo "shadcn scaffold" (`dropdown-menu`, `combobox`, `sheet`, `toast`) —
viram glob de pasta (`src/shared/ui/avatar/**`, etc.), mantendo o comentário/motivo já escrito acima de
cada bloco. Isso vale mesmo para os 7 atômicos que não ganham `components/` nem `types.ts` (D9): o
arquivo continua indo para dentro de uma pasta, então o caminho no `vitest.config.ts` muda de qualquer
forma. `input-group`, `tooltip`, `confirm-dialog` e `color-swatch-picker` não têm e não ganham entrada
nova: já não estavam na lista de exclusão (cobertura real, ver D5 de `docs/ARCHITECTURE.md`) e o glob
genérico `src/**/*.test.{ts,tsx}` já cobre o teste migrado de cada um sem precisar de entrada própria.

> `kbd.tsx` entrou na lista de componentes compostos em 2026-09-17, depois da versão inicial de D1–D8 —
> foi classificado por engano como atômico (exporta na verdade `Kbd` + `KbdGroup`, mesma forma de
> `avatar`/`card`; ver correção em `spec.md` §Assumptions e `data-model.md` §kbd/). Na mesma data, D9
> ampliou o escopo desta decisão de "as 7-8 entradas dos componentes compostos" para "todas as 16",
> porque os atômicos também passaram a virar pasta.

**Rationale**: É a leitura literal do FR-008 — preservar o status atual de cada componente, só
atualizando o caminho. Um glob de pasta (`/**`) em vez de listar `index.tsx` +
`components/*.tsx` um a um evita que a lista de exclusão precise de manutenção toda vez que uma
sub-parte for adicionada/removida dentro de um componente já listado.

**Alternatives considered**: Listar cada arquivo novo individualmente (`combobox/index.tsx`,
`combobox/components/combobox-item.tsx`, …) — rejeitado por criar ~60 linhas novas de configuração para
manter manualmente, um custo que o glob de pasta evita sem mudar o resultado.

## D9 — Escopo ampliado em 2026-09-17: todo componente vira pasta, não só os compostos

**Decision**: A pedido explícito do usuário ("para seguirmos o padrão do projeto"), FR-001 deixou de se
aplicar só aos 11 componentes compostos e passou a valer para os 20 — os 9 hoje atômicos
(`badge`, `button`, `color-swatch-picker`, `FullScreenMessage`, `input`, `label`, `separator`,
`skeleton`, `textarea`) também ganham pasta própria com `index.tsx`. O critério do FR-004 não muda de
significado — só deixa de decidir "ganha pasta ou não" e passa a decidir só "ganha `components/` ou
não". Estendendo a mesma lógica, FR-002 também virou condicional: `<nome>.types.ts` só existe quando há
um tipo próprio real para extrair (ver D2) — dos 9 atômicos, só `color-swatch-picker`
(`ColorSwatchOption`, `ColorSwatchPickerProps`, hoje já exportados/definidos sem depender de nenhum
`cva()`) e `FullScreenMessage` (`{ title, description, action }`, também sem `cva()`) se qualificam; os
outros 7 só repassam `React.ComponentProps<'x'>` ou têm uma variante `cva` que fica com o próprio
componente (D2) — ficam só com `index.tsx`.

**Rationale**: Consistência estrutural — antes desta decisão, `shared/ui/` teria uma parte em pasta e
outra em arquivo solto, exigindo que quem procura um componente soubesse de antemão se ele é "composto"
ou não antes de saber onde olhar. Generalizar `<nome>.types.ts` para "só quando há conteúdo real" (em
vez de criá-lo sempre, mesmo vazio) segue o mesmo princípio já usado em FR-003 para `components/` — um
arquivo `.types.ts` vazio ou com um tipo reexportado artificialmente só para não ficar vazio seria
ruído, não organização.

**Alternatives considered**:
- Manter `<nome>.types.ts` obrigatório em todas as 20 pastas, mesmo vazio — rejeitado por criar até 7
  arquivos sem nenhum conteúdo real, o oposto do que a feature busca (menos ruído, não mais).
- Normalizar `FullScreenMessage.tsx` para `full-screen-message/` (kebab-case) já que a pasta está sendo
  criada mesmo assim — rejeitado porque mudaria o caminho de import (`@/shared/ui/FullScreenMessage` →
  `@/shared/ui/full-screen-message`), violando FR-005; a pasta nova mantém a grafia exata de hoje
  (`FullScreenMessage/`), e a inconsistência de casing entre esse componente e o resto de `shared/ui/`
  continua existindo, sem ser resolvida por esta feature.

## D8 — Localização física da skill `agenza-ui-primitive` (FR-010)

**Finding (não uma decisão de desenho, um limite encontrado)**: A skill `agenza-ui-primitive` aparece
na lista de skills disponíveis desta sessão, mas nenhum arquivo correspondente foi encontrado em
`apps/admin-frontend/.claude/skills/`, no restante do repositório, nem em `~/.claude/skills/` ou
`~/.claude/plugins/` — provavelmente vem de um plugin/marketplace resolvido em tempo de execução, fora
do que uma busca em disco a partir deste projeto alcança.

**Impact**: FR-010 exige atualizar essa skill para apontar para `docs/ARCHITECTURE.md` em vez de
duplicar a convenção. Antes de `/speckit-tasks` transformar isso numa tarefa concreta de edição de
arquivo, quem for implementar precisa localizar o arquivo real (via o gerenciador de plugins, `/plugin`,
ou perguntando à pessoa responsável) — não assumir um caminho. Isso não bloqueia o restante da migração
(os outros 9 FRs não dependem disso), então fica como o único item do plano sem caminho de arquivo
fechado.

**Rationale para não travar o plano por causa disso**: A parte de `docs/ARCHITECTURE.md` do FR-010 tem
caminho e seção exatos (§1 e §5, já existentes) e não depende de encontrar a skill; a atualização da
skill pode ser uma tarefa separada em `tasks.md`, sinalizada como dependente de localizar o arquivo
primeiro.
