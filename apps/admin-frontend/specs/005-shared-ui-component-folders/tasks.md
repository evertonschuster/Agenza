---

description: "Task list template for feature implementation"
---

# Tasks: Pastas por Componente Composto em shared/ui

**Input**: Design documents from `/specs/005-shared-ui-component-folders/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [quickstart.md](./quickstart.md)

**Tests**: Não solicitados por esta feature (FR-007 proíbe explicitamente dividir/reescrever os 2 testes
colocalizados; Out of Scope não inclui nenhum teste novo). As únicas tarefas relacionadas a teste são
mover os 2 arquivos existentes (dentro das tarefas T006 e T009) e rodar a suíte completa como validação
final (Fase 7).

**Organização**: Cada tarefa de migração de componente é uma unidade completa e independentemente
testável — o mapeamento símbolo-a-símbolo de cada uma já está fechado em
[data-model.md](./data-model.md); esta lista referencia esse documento em vez de repetir cada tabela.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1, US2 ou US3 — mapeiam para as User Stories de `spec.md`. Fases sem label (Setup,
  Foundational, Fase 6, Polish) não pertencem a nenhuma User Story específica — mesma convenção que o
  template usa para essas fases.
- Caminhos de arquivo exatos em cada descrição

## Path Conventions

Projeto único existente — `apps/admin-frontend/src/shared/ui/`. Todos os caminhos abaixo são relativos a
`apps/admin-frontend/`.

## Nota sobre organização das fases

Esta feature tem 3 User Stories em `spec.md` (US1 P1, US2 P2, US3 P3) mais um bloco de trabalho que **não
pertence a nenhuma delas**: a padronização dos 9 componentes hoje atômicos (`badge`, `button`,
`color-swatch-picker`, `FullScreenMessage`, `input`, `label`, `separator`, `skeleton`, `textarea`), que
entrou no escopo em 2026-09-17 a pedido do usuário, depois das 3 User Stories já estarem escritas — ver
`research.md` D9. Como US1/US2/US3 falam especificamente de "componente composto", essas 9 tarefas ficam
numa fase própria (Fase 6), sem label de story, na mesma posição estrutural que Setup/Foundational/Polish
já ocupam no template (trabalho real, mas não amarrado a uma User Story nomeada).

---

## Phase 1: Setup

**Purpose**: Estabelecer a referência "antes" — nenhuma mudança de comportamento é esperada ao final
(FR-009), então este é o resultado que toda fase seguinte precisa continuar batendo.

- [X] T001 Rodar `npm run lint`, `npm run format:check` e `npm run test:coverage` na árvore atual (antes
  de qualquer migração) e guardar a saída como referência — nenhum destes três deve mudar de resultado
  ao final da feature, só de caminho de arquivo nos relatórios. **Referência**: 6 avisos de lint (0
  erros — `react-refresh/only-export-components` em `badge.tsx`, `button.tsx`, `combobox.tsx`,
  `toast.tsx` x3), Prettier limpo, 196 testes (39 arquivos) passando, cobertura 91.25%/86.34%/85.84%/
  92.19% (stmts/branch/funcs/lines) — funções a 0.84pp do limiar de 85%.

---

## Phase 2: Foundational

**Purpose**: Não há infraestrutura nova compartilhada bloqueando as User Stories — cada um dos 20
componentes migra de forma independente (FR-005 garante que `@/shared/ui/<nome>` resolve igual antes e
depois, então a ordem de migração entre componentes não importa). A única checagem genuinamente
bloqueante é confirmar que o mapeamento já fechado em `data-model.md` ainda bate com o código real.

**⚠️ CRITICAL**: Completar antes de iniciar qualquer tarefa de migração (Fases 3, 4, 6).

- [X] T002 Conferir que os 20 arquivos de `src/shared/ui/` ainda têm exatamente os exports e a forma
  descritos em [data-model.md](./data-model.md) (nenhum commit recente em `shared/ui/` mudou algo desde
  que o mapeamento foi feito em 2026-09-16/17). Se algo mudou, atualizar `data-model.md` antes de seguir.
  **Confirmado**: `git status --short src/shared/ui/` limpo; commit mais recente ali (`f4c9f53`) é o
  mesmo já visto ao mapear — nada mudou.

**Checkpoint**: Mapeamento confirmado — as migrações das Fases 3, 4 e 6 podem começar, inclusive em
paralelo entre si.

---

## Phase 3: User Story 1 - Alterar uma sub-parte de um componente composto sem abrir o arquivo inteiro (Priority: P1) 🎯 MVP

**Goal**: Cada um dos 11 componentes compostos vira pasta própria com `index.tsx` (ponto de entrada,
reexportando tudo) e `components/` (uma sub-parte por arquivo). Os tipos próprios de cada sub-parte
**ficam inline** por enquanto, exatamente onde estão hoje, dentro do arquivo que migrou para
`components/` ou para `index.tsx` — extraí-los para `<nome>.types.ts` é a Fase 4 (US2), um incremento
separado e opcional sobre este.

**Independent Test**: Abrir a pasta de qualquer um dos 11 componentes e confirmar que cada sub-parte
interna está em seu próprio arquivo dentro de `components/`, localizável pelo nome, sem abrir um arquivo
que também contenha as demais sub-partes (spec.md, User Story 1).

### Implementation for User Story 1

- [X] T003 [P] [US1] Restruturar `avatar` em `src/shared/ui/avatar/`: `index.tsx` com `Avatar` (raiz,
  tipo `size` ainda inline) reexportando `components/*`; `components/avatar-image.tsx`,
  `avatar-fallback.tsx`, `avatar-badge.tsx`, `avatar-group.tsx`, `avatar-group-count.tsx` — um símbolo
  cada, mapeamento completo em data-model.md §avatar/. Atualizar a entrada `src/shared/ui/avatar.tsx` de
  `vitest.config.ts` `coverage.exclude` para `src/shared/ui/avatar/**`. Apagar `src/shared/ui/avatar.tsx`.
- [X] T004 [P] [US1] Restruturar `card` em `src/shared/ui/card/`: `index.tsx` com `Card` (raiz, tipo
  `size` ainda inline) reexportando `components/*`; `components/card-header.tsx`, `card-title.tsx`,
  `card-description.tsx`, `card-action.tsx`, `card-content.tsx`, `card-footer.tsx` — mapeamento completo
  em data-model.md §card/. Atualizar a entrada `card.tsx` de `vitest.config.ts` para `card/**`. Apagar
  `src/shared/ui/card.tsx`.
- [X] T005 [P] [US1] Restruturar `combobox` em `src/shared/ui/combobox/`: `index.tsx` com `Combobox`
  (raiz) e `useComboboxAnchor` (hook de uma linha, fica em `index.tsx` — research.md D4), reexportando
  `components/*`; 15 arquivos em `components/` (`combobox-value.tsx` até `combobox-chips-input.tsx`,
  tipos `ComboboxInputProps`/`ComboboxChipProps` ainda inline nos respectivos arquivos) — mapeamento
  completo em data-model.md §combobox/. `components/combobox-input.tsx` mantém
  `from '@/shared/ui/input-group'` (absoluto, inalterado). Atualizar a entrada `combobox.tsx` de
  `vitest.config.ts` para `combobox/**`. Apagar `src/shared/ui/combobox.tsx`.
- [X] T006 [P] [US1] Restruturar `confirm-dialog` em `src/shared/ui/confirm-dialog/`: `index.tsx` com
  `ConfirmDialog<T>` (mantém `useState`/`handleConfirm`, tipos ainda inline); `components/confirm-dialog-blocked-view.tsx`
  e `components/confirm-dialog-confirm-view.tsx` para os dois ramos JSX — mapeamento completo em
  data-model.md §confirm-dialog/. **Ajustar os 2 imports relativos** (research.md D6):
  `from '../api/servicesFacade'` → `from '../../api/servicesFacade'`, `from './toast'` →
  `from '../toast'`. **Mover** `confirm-dialog.test.tsx` para `confirm-dialog/confirm-dialog.test.tsx`,
  ajustando `from './confirm-dialog'` → `from '.'`. Apagar os dois arquivos originais na raiz de
  `shared/ui/`. (`dialog.tsx`/`vitest.config.ts` não muda por causa desta tarefa — ver T007.)
- [X] T007 [P] [US1] Restruturar `dialog` em `src/shared/ui/dialog/`: `index.tsx` com `Dialog` (raiz)
  reexportando `components/*`; `components/dialog-trigger.tsx`, `dialog-portal.tsx`, `dialog-close.tsx`,
  `dialog-overlay.tsx`, `dialog-content.tsx` (tipo `DialogContentProps` ainda inline; importa
  `dialog-portal`/`dialog-overlay` do próprio `components/`), `dialog-header.tsx`, `dialog-footer.tsx`
  (tipo `DialogFooterProps` ainda inline), `dialog-title.tsx`, `dialog-description.tsx` — mapeamento
  completo em data-model.md §dialog/. Atualizar a entrada `dialog.tsx` de `vitest.config.ts` para
  `dialog/**`. Apagar `src/shared/ui/dialog.tsx`.
- [X] T008 [P] [US1] Restruturar `dropdown-menu` em `src/shared/ui/dropdown-menu/`: `index.tsx` com
  `DropdownMenu` (raiz) reexportando `components/*`; 14 arquivos em `components/`
  (`dropdown-menu-portal.tsx` até `dropdown-menu-shortcut.tsx`, tipos `…ItemProps`/`…LabelProps`/etc.
  ainda inline) — mapeamento completo em data-model.md §dropdown-menu/.
  `components/dropdown-menu-sub-content.tsx` importa `dropdown-menu-content.tsx` do próprio
  `components/`. Atualizar a entrada `dropdown-menu.tsx` de `vitest.config.ts` para `dropdown-menu/**`.
  Apagar `src/shared/ui/dropdown-menu.tsx`.
- [X] T009 [P] [US1] Restruturar `input-group` em `src/shared/ui/input-group/`: `index.tsx` com
  `InputGroup` (raiz) reexportando `components/*`; `components/input-group-addon.tsx` (com
  `inputGroupAddonVariants`), `input-group-button.tsx` (com `inputGroupButtonVariants`),
  `input-group-text.tsx`, `input-group-input.tsx`, `input-group-textarea.tsx` — mapeamento completo em
  data-model.md §input-group/. Sem `input-group.types.ts` (nenhum tipo próprio real — data-model.md).
  **Mover** `input-group.test.tsx` para `input-group/input-group.test.tsx`, ajustando
  `from './input-group'` → `from '.'`. Apagar os dois arquivos originais na raiz de `shared/ui/`.
- [X] T010 [P] [US1] Restruturar `kbd` em `src/shared/ui/kbd/`: `index.tsx` com `Kbd` (raiz)
  reexportando `components/kbd-group.tsx` (`KbdGroup`) — mapeamento completo em data-model.md §kbd/. Sem
  `kbd.types.ts` (nenhum tipo próprio real). Atualizar a entrada `kbd.tsx` de `vitest.config.ts` para
  `kbd/**`. Apagar `src/shared/ui/kbd.tsx`.
- [X] T011 [P] [US1] Restruturar `sheet` em `src/shared/ui/sheet/`: `index.tsx` com `Sheet` (raiz)
  reexportando `components/*`; `components/sheet-trigger.tsx`, `sheet-close.tsx`, `sheet-portal.tsx`,
  `sheet-overlay.tsx`, `sheet-content.tsx` (tipos `SheetSide`/`SheetContentProps` ainda inline),
  `sheet-header.tsx`, `sheet-footer.tsx`, `sheet-title.tsx`, `sheet-description.tsx` — mapeamento
  completo em data-model.md §sheet/. Atualizar a entrada `sheet.tsx` de `vitest.config.ts` para
  `sheet/**`. Apagar `src/shared/ui/sheet.tsx`.
- [X] T012 [P] [US1] Restruturar `toast` em `src/shared/ui/toast/`: `index.tsx` com `Toast` e `Toaster`
  (duas raízes — research.md D1) mais `createToastManager`/`toast`/`useToastManager` reexportados do
  primitivo, reexportando `components/*`; `components/toast-provider.tsx`, `toast-portal.tsx`,
  `toast-viewport.tsx`, `toast-content.tsx`, `toast-title.tsx`, `toast-description.tsx`,
  `toast-action.tsx`, `toast-close.tsx`, `toast-icon.tsx` (tipo `ToastIconProps` ainda inline),
  `toast-list.tsx` (importa `Toast` de `'..'` e os irmãos de `components/`) — mapeamento completo em
  data-model.md §toast/. Atualizar a entrada `toast.tsx` de `vitest.config.ts` para `toast/**`. Apagar
  `src/shared/ui/toast.tsx`.
- [X] T013 [P] [US1] Restruturar `tooltip` em `src/shared/ui/tooltip/`: `index.tsx` com `Tooltip` (raiz)
  reexportando `components/*`; `components/tooltip-provider.tsx`, `tooltip-trigger.tsx`,
  `tooltip-content.tsx` — mapeamento completo em data-model.md §tooltip/. Sem `tooltip.types.ts`
  (nenhum tipo próprio real). `tooltip.tsx` não está em `vitest.config.ts` — nenhuma entrada para
  atualizar. Apagar `src/shared/ui/tooltip.tsx`.

**Checkpoint**: Os 11 componentes compostos são pasta com `components/`; nenhum arquivo de
`shared/ui/` passa de ~90 linhas. `npm run test:coverage`/`npm run lint`/`npx tsc --noEmit` batem com a
referência de T001. MVP entregue — já resolve a dor central do pedido original.

---

## Phase 4: User Story 2 - Ler o contrato de tipos de um componente sem abrir a implementação (Priority: P2)

**Goal**: Extrair, para os 8 componentes compostos que têm tipo próprio real, os tipos hoje inline
(deixados assim na Fase 3) para `<nome>.types.ts`, atualizando os arquivos que os usam para importar de
lá. `input-group`, `kbd` e `tooltip` não entram aqui — não têm tipo próprio para extrair
(data-model.md).

**Independent Test**: Abrir só o arquivo de tipos de um dos 8 componentes e confirmar que todo prop/tipo
da API pública dele está ali, sem JSX nem classe de estilo (spec.md, User Story 2).

**Nota de dependência**: cada tarefa abaixo só depende da tarefa **do mesmo componente** na Fase 3 (ex.
T014 depende só de T003, não de T004–T013) — não é preciso esperar a Fase 3 inteira terminar para
começar a extrair tipos de um componente já migrado.

### Implementation for User Story 2

- [X] T014 [P] [US2] Extrair `AvatarSize = 'default' | 'sm' | 'lg'` de `avatar/index.tsx` para
  `avatar/avatar.types.ts`; `index.tsx` importa o tipo de volta. Depende de T003.
- [X] T015 [P] [US2] Extrair `CardSize = 'default' | 'sm'` de `card/index.tsx` para
  `card/card.types.ts`; `index.tsx` importa o tipo de volta. Depende de T004.
- [X] T016 [P] [US2] Extrair `ComboboxInputProps` (de `components/combobox-input.tsx`) e
  `ComboboxChipProps` (de `components/combobox-chip.tsx`) para `combobox/combobox.types.ts`; os dois
  arquivos passam a importar de `../combobox.types`. Depende de T005.
- [X] T017 [P] [US2] Extrair `ConfirmDialogFailure`, `ConfirmDialogConfirmation`, `ConfirmDialogError`,
  `ConfirmDialogSuccess`, `ConfirmDialogProps<T>` de `confirm-dialog/index.tsx` para
  `confirm-dialog/confirm-dialog.types.ts`; `index.tsx` importa os 5 tipos de volta. Depende de T006.
- [X] T018 [P] [US2] Extrair `DialogContentProps` (de `components/dialog-content.tsx`) e
  `DialogFooterProps` (de `components/dialog-footer.tsx`) para `dialog/dialog.types.ts`; os dois
  arquivos passam a importar de `../dialog.types`. Depende de T007.
- [X] T019 [P] [US2] Extrair `DropdownMenuLabelProps`, `DropdownMenuItemProps`,
  `DropdownMenuSubTriggerProps`, `DropdownMenuCheckboxItemProps`, `DropdownMenuRadioItemProps` dos
  respectivos arquivos em `components/` para `dropdown-menu/dropdown-menu.types.ts`; cada arquivo passa
  a importar seu tipo de `../dropdown-menu.types`. Depende de T008.
- [X] T020 [P] [US2] Extrair `SheetSide` e `SheetContentProps` de `components/sheet-content.tsx` para
  `sheet/sheet.types.ts`; o arquivo passa a importar de `../sheet.types`. Depende de T011.
- [X] T021 [P] [US2] Extrair `ToastIconProps = { type: string | undefined }` (tipo preservado
  exatamente como está — sem apertar para união de literais, FR-009) de `components/toast-icon.tsx`
  para `toast/toast.types.ts`; o arquivo passa a importar de `../toast.types`. Depende de T012.

**Checkpoint**: Os 8 componentes com tipo próprio real têm seu contrato legível num arquivo só, sem
tocar em nenhum JSX. `npx tsc --noEmit` continua limpo (nenhum `any`, nenhum tipo perdido na extração).

---

## Phase 5: User Story 3 - Adicionar um novo componente composto seguindo um padrão já definido (Priority: P3)

**Goal**: Documentar o padrão (quando um componente ganha `components/`, quando ganha `<nome>.types.ts`,
onde cada peça vai) no lugar que já é a fonte da verdade para decisões estruturais deste app, para que
uma pessoa desenvolvedora não precise re-derivar a convenção ao criar um componente composto novo.

**Independent Test**: Uma pessoa que não participou desta migração consegue montar a estrutura de um
componente composto novo lendo só a documentação, sem perguntar a outra pessoa da equipe (spec.md, User
Story 3). Não depende das Fases 3/4/6 estarem completas — pode rodar em paralelo com elas.

### Implementation for User Story 3

- [X] T022 [P] [US3] Atualizar `docs/ARCHITECTURE.md`: (a) §1, nova frase ao lado da já existente sobre
  páginas ("Sub-components go in a `components/` subfolder, created only when a page actually grows
  them"), descrevendo a mesma regra para `shared/ui/` — pasta para todo componente, `<nome>.types.ts` e
  `components/` só quando há conteúdo real para cada um; (b) §5 (tabela de decisões), nova linha no
  mesmo padrão das linhas já existentes sobre `confirm-dialog` e `color-swatch-picker`, citando
  `specs/005-shared-ui-component-folders/`.
- [ ] T023 [P] [US3] Localizar o arquivo físico da skill `agenza-ui-primitive` (não encontrado em disco
  a partir deste projeto durante o planejamento — research.md D8; verificar via gerenciador de plugins
  ou perguntar à pessoa responsável) e atualizá-lo para apontar para a entrada de
  `docs/ARCHITECTURE.md` criada em T022, em vez de duplicar a convenção ali. **Não concluída**: busca
  em disco (repositório, `~/.claude/skills`, `~/.claude/plugins`, e uma varredura mais ampla do
  sistema de arquivos) não localizou o arquivo — mesma conclusão de research.md D8. `docs/ARCHITECTURE.md`
  (T022) já é a fonte da verdade e não depende desta tarefa; fica pendente para quem tiver acesso ao
  gerenciador de plugins ou souber onde a skill está registrada.

**Checkpoint**: Convenção documentada num lugar só, referenciada (não duplicada) por quem mexe em
`shared/ui/` no dia a dia.

---

## Phase 6: Padronização dos Componentes Atômicos (extensão de escopo 2026-09-17)

**Goal**: Aplicar a mesma pasta-por-componente aos 9 componentes hoje atômicos, para que `shared/ui/`
não tenha uma parte em pasta e outra em arquivo solto (pedido explícito do usuário, fora do texto
original das 3 User Stories — ver nota no topo deste documento e research.md D9). `components/` não se
aplica a nenhum destes 9 (nenhum tem sub-parte interna). `<nome>.types.ts` só se aplica a 2 dos 9.

**Independent Test**: Abrir a pasta de qualquer um dos 9 e confirmar que ela contém só `index.tsx` (ou
`index.tsx` + `<nome>.types.ts` para os 2 marcados abaixo) — nenhuma pasta `components/` vazia criada
por antecipação.

### Implementation

- [X] T024 [P] Mover `badge.tsx` para `src/shared/ui/badge/index.tsx` (`Badge` + `badgeVariants`, sem
  mudança de conteúdo). Sem `badge.types.ts` (`VariantProps<typeof badgeVariants>` é o único tipo e fica
  com o `cva()`, no próprio `index.tsx`). Atualizar a entrada `badge.tsx` de `vitest.config.ts` para
  `badge/**`. Apagar `src/shared/ui/badge.tsx`.
- [X] T025 [P] Mover `button.tsx` para `src/shared/ui/button/index.tsx` (`Button` + `buttonVariants`,
  sem mudança de conteúdo). Sem `button.types.ts` (mesmo caso de `badge/`). Atualizar a entrada
  `button.tsx` de `vitest.config.ts` para `button/**`. Apagar `src/shared/ui/button.tsx`.
- [X] T026 [P] Restruturar `color-swatch-picker` em `src/shared/ui/color-swatch-picker/`: `index.tsx`
  com `ColorSwatchPicker`; extrair `ColorSwatchOption` e `ColorSwatchPickerProps` (já existem hoje como
  `interface`, sem depender de `cva`) para `color-swatch-picker.types.ts`. `color-swatch-picker.tsx`
  não está em `vitest.config.ts` — nenhuma entrada para atualizar. Apagar
  `src/shared/ui/color-swatch-picker.tsx`.
- [X] T027 [P] Restruturar `FullScreenMessage` em `src/shared/ui/FullScreenMessage/` (**grafia
  PascalCase preservada** — não normalizar para `full-screen-message/`, isso mudaria o caminho de
  import e violaria FR-005): `index.tsx` com `FullScreenMessage`; extrair `FullScreenMessageProps`
  (`{ title, description, action? }`, hoje inline) para `FullScreenMessage.types.ts`. Atualizar a
  entrada `FullScreenMessage.tsx` de `vitest.config.ts` para `FullScreenMessage/**`. Apagar
  `src/shared/ui/FullScreenMessage.tsx`.
- [X] T028 [P] Mover `input.tsx` para `src/shared/ui/input/index.tsx` (`Input`, sem mudança de
  conteúdo). Sem `input.types.ts` (só repassa `React.ComponentProps<'input'>`). Atualizar a entrada
  `input.tsx` de `vitest.config.ts` para `input/**`. Apagar `src/shared/ui/input.tsx`.
- [X] T029 [P] Mover `label.tsx` para `src/shared/ui/label/index.tsx` (`Label`, sem mudança de
  conteúdo). Sem `label.types.ts`. Atualizar a entrada `label.tsx` de `vitest.config.ts` para
  `label/**`. Apagar `src/shared/ui/label.tsx`.
- [X] T030 [P] Mover `separator.tsx` para `src/shared/ui/separator/index.tsx` (`Separator`, sem mudança
  de conteúdo). Sem `separator.types.ts`. Atualizar a entrada `separator.tsx` de `vitest.config.ts` para
  `separator/**`. Apagar `src/shared/ui/separator.tsx`.
- [X] T031 [P] Mover `skeleton.tsx` para `src/shared/ui/skeleton/index.tsx` (`Skeleton`, sem mudança de
  conteúdo). Sem `skeleton.types.ts`. Atualizar a entrada `skeleton.tsx` de `vitest.config.ts` para
  `skeleton/**`. Apagar `src/shared/ui/skeleton.tsx`.
- [X] T032 [P] Mover `textarea.tsx` para `src/shared/ui/textarea/index.tsx` (`Textarea`, sem mudança de
  conteúdo). Sem `textarea.types.ts`. Atualizar a entrada `textarea.tsx` de `vitest.config.ts` para
  `textarea/**`. Apagar `src/shared/ui/textarea.tsx`.

**Checkpoint**: `shared/ui/` não tem mais nenhum arquivo `.tsx` solto na raiz — os 20 componentes são
pasta.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Confirmar, com a suíte real, que nada listado em FR-009/NFR-001/NFR-002 regrediu. Depende
de todas as fases anteriores que forem executadas nesta rodada.

- [X] T033 [P] Rodar `npx tsc --noEmit` na árvore completa — zero erro, incluindo os 4 imports
  relativos ajustados em T006 e os imports entre irmãos dentro de `components/` (T005, T007, T008,
  T012). **Zero erros** (1 erro real encontrado e corrigido durante a migração: `ComboboxClear`
  importado sem uso em `combobox/index.tsx` — nunca foi exportado no arquivo original).
- [X] T034 [P] Rodar `npm run lint` e `npm run format:check` — mesmo resultado da referência de T001,
  só com caminhos novos nos relatórios. **Lint**: mesmos 6 avisos de `react-refresh/only-export-components`,
  agora em `badge/index.tsx`, `button/index.tsx`, `combobox/index.tsx`, `toast/index.tsx` (3x) — 0 erros,
  igual à referência. **Format**: 3 arquivos precisaram de `prettier --write` (quebra de linha em
  parâmetros longos — `dialog-content.tsx`, `dialog-footer.tsx`, `dropdown-menu-radio-item.tsx`); limpo
  depois.
- [X] T035 Rodar `npm run test:coverage` e comparar com a referência de T001: os limiares (85%
  linhas/funções/statements, 80% branches) continuam batendo, e nenhum componente mudou de status
  incluído/excluído como efeito colateral (data-model.md, mapeamento de `vitest.config.ts`). **Resultado**:
  91.27/86.34/85.96/92.21% (stmts/branch/funcs/lines) — praticamente idêntico à referência
  (91.25/86.34/85.84/92.19%), 39 arquivos/196 testes passando, igual à referência.
- [ ] T036 [P] Rodar `npm run generate:api-types:check` — sem drift (esta feature não toca contrato de
  backend). **Não executável nesta sessão**: falha com `ECONNREFUSED` na porta 5080 — o script precisa
  do stack Aspire (backend) rodando, que não está disponível aqui. Não é regressão desta feature (o
  script não toca `shared/ui/`); precisa rodar de novo com o Aspire de pé antes do merge.
- [ ] T037 Rodar `npm run test:e2e` — mesmos cenários de antes passando sem alteração de spec de teste
  (prova mais forte de FR-009). **Não executável nesta sessão**: Playwright roda contra o stack Aspire
  real (login semeado, sem mocks — Constitution Principle V), que não está disponível aqui; precisa
  rodar antes do merge.
- [ ] T038 Conferência manual via navegador, seguindo quickstart.md §4: `/tags` (confirm-dialog,
  dialog, input-group, toast), menu de tema (dropdown-menu), paleta de comando (combobox, sheet) — zero
  diferença visual perceptível. **Não executável nesta sessão**: exige o app rodando via Aspire
  (`npm run dev` orquestrado, porta 5173 + backend); precisa ser feita manualmente antes do merge.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001)**: sem dependência — roda primeiro.
- **Foundational (T002)**: depende de T001 só por ordem lógica (não por dado que T001 produza);
  bloqueia as Fases 3, 4 e 6.
- **User Story 1 (T003–T013)**: depende de T002. Os 11 componentes são independentes entre si.
- **User Story 2 (T014–T021)**: cada tarefa depende só da tarefa homônima da Fase 3 (ver nota de
  dependência na Fase 4) — não da Fase 3 inteira.
- **User Story 3 (T022–T023)**: depende só de T002 — não depende de nenhuma tarefa de migração de
  componente, pode rodar em paralelo com as Fases 3, 4 e 6.
- **Fase 6 (T024–T032)**: depende de T002. Os 9 componentes são independentes entre si e entre as Fases
  3/4/5 — pode rodar em paralelo com todas elas.
- **Polish (T033–T038)**: depende de todas as fases anteriores que forem executadas nesta rodada.

### Parallel Opportunities

- T003–T013 (US1, 11 componentes), T024–T032 (Fase 6, 9 componentes) e T022–T023 (US3, documentação)
  não compartilham arquivo entre si — **as 3 fases inteiras podem rodar em paralelo**, não só dentro de
  cada uma.
- Dentro de US2, cada tarefa (T014–T021) pode começar assim que a tarefa correspondente de US1 estiver
  pronta, sem esperar as outras 10 tarefas de US1.
- T033, T034 e T036 (Polish) não dependem uma da outra — podem rodar em paralelo entre si; T035 e T037
  são mais pesadas (cobertura, e2e contra o stack real) e ficam melhor sequenciais.

---

## Parallel Example: User Story 1

```bash
# Os 11 componentes compostos, cada um em sua própria pasta — nenhum compartilha arquivo:
Task: "Restruturar avatar em src/shared/ui/avatar/ (T003)"
Task: "Restruturar card em src/shared/ui/card/ (T004)"
Task: "Restruturar combobox em src/shared/ui/combobox/ (T005)"
# ...T006–T013 da mesma forma
```

---

## Implementation Strategy

### MVP First (User Story 1 apenas)

1. Completar Fase 1 (Setup) e Fase 2 (Foundational).
2. Completar Fase 3 (US1) — os 11 componentes compostos viram pasta com `components/`.
3. **PARAR e VALIDAR**: rodar T033/T034/T035 contra só essas 11 mudanças.
4. Isso já entrega o valor central do pedido original — nenhum arquivo de `shared/ui/` passa de ~90
   linhas para encontrar uma sub-parte.

### Incremental Delivery

1. Setup + Foundational → base confirmada.
2. US1 → validar independentemente → já é um PR revisável e completo por si (MVP).
3. US2 → validar independentemente → tipos ficam legíveis num arquivo só, sem tocar em JSX de novo.
4. US3 → pode ser feito a qualquer momento, até antes de US1/US2 (só documentação).
5. Fase 6 → pode ser feita a qualquer momento, em paralelo com tudo (componentes atômicos, sem relação
   de arquivo com os compostos).
6. Polish → depois de tudo que for feito nesta rodada.

### Parallel Team Strategy

Com mais de uma pessoa: depois de Foundational, uma pessoa pode tocar US1+US2 (as 11 pastas compostas,
que têm dependência interna entre si — types.ts depende da sub-parte já ter migrado), outra pode tocar
Fase 6 (os 9 atômicos) e uma terceira US3 (documentação) — as três frentes não tocam no mesmo arquivo em
nenhum momento.

---

## Notes

- [P] = arquivos diferentes, sem dependência.
- Cada tarefa de componente já referencia a seção exata de `data-model.md` com o mapeamento
  símbolo-a-símbolo — não repetido aqui para não divergir de duas fontes.
- Commitar depois de cada tarefa de componente (ou grupo pequeno) facilita reverter uma migração
  isolada se `tsc`/lint/teste quebrar nela especificamente.
- Nenhuma tarefa desta lista deve alterar comportamento, texto visível ou contrato de props — qualquer
  diff que não seja puramente estrutural é regressão (FR-009), não parte do escopo.
