# Phase 1 Data Model: Pastas por Componente Composto em shared/ui

Esta feature não tem entidade de domínio — o "modelo" aqui é estrutural: qual arquivo existe, o que ele
exporta, e de quem ele depende. Este documento é o mapeamento completo, componente a componente, que
`/speckit-tasks` deve fatiar em tarefas.

**Escopo ampliado em 2026-09-17** (research.md D9): as seções abaixo cobriam originalmente só os
componentes compostos. A pedido do usuário, **todos os 20 componentes de `shared/ui/` ganham pasta**
agora — as seções "avatar/" até "confirm-dialog/" são os 11 compostos (com `components/`); a seção
"Componentes atômicos" cobre os outros 9 (pasta com só `index.tsx`, e `<nome>.types.ts` quando há tipo
próprio real). `kbd/` também foi adicionado nesta data — a versão anterior deste documento o
classificava como atômico por engano; ele exporta `Kbd` + `KbdGroup`, mesma forma de `avatar`/`card`.

Toda pasta de componente segue esta convenção (research.md D1–D2, D9):

- `index.tsx` — ponto de entrada público, **sempre presente**; exporta o(s) componente(s)-raiz (nome
  igual ao da pasta) e reexporta tudo que vem de `components/`. É o único arquivo que muda com
  `@/shared/ui/<nome>` de fora.
- `<nome>.types.ts` — só declarações de tipo, **presente só quando há pelo menos um tipo próprio real**
  para extrair; nunca uma chamada `cva()` (essa fica com o componente que a usa — ver research.md D2).
  Ausente quando o componente só repassa `React.ComponentProps<'x'>` ou só tem tipo derivado de `cva`.
- `components/<sub-parte>.tsx` — uma sub-parte por arquivo, nomeada em kebab-case a partir do nome do
  componente exportado, **presente só para os 11 componentes que se qualificam pelo FR-004**. Não
  importado de fora da pasta (FR-006) — só por `index.tsx` ou por outra sub-parte do mesmo componente.

## avatar/

| Símbolo atual | Novo local |
|---|---|
| `Avatar` (raiz, prop `size`) | `index.tsx` |
| `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount` | `components/avatar-image.tsx`, `components/avatar-fallback.tsx`, `components/avatar-badge.tsx`, `components/avatar-group.tsx`, `components/avatar-group-count.tsx` |

`avatar.types.ts`: `AvatarSize = 'default' | 'sm' | 'lg'` (hoje inline em `Avatar`'s props).

## card/

| Símbolo atual | Novo local |
|---|---|
| `Card` (raiz, prop `size`) | `index.tsx` |
| `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` | um arquivo cada em `components/card-*.tsx` |

`card.types.ts`: `CardSize = 'default' | 'sm'` (hoje inline em `Card`'s props).

## dialog/

| Símbolo atual | Novo local |
|---|---|
| `Dialog` (raiz) | `index.tsx` |
| `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogOverlay`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription` | `components/dialog-*.tsx`, um por símbolo |

`dialog.types.ts`: `DialogContentProps` (`{ showCloseButton?: boolean }` sobre `DialogPrimitive.Popup.Props`),
`DialogFooterProps` (`{ showCloseButton?: boolean }` sobre `React.ComponentProps<'div'>`).

Nota: `components/dialog-content.tsx` importa `DialogPortal` e `DialogOverlay` do mesmo `components/`
(import relativo entre irmãos, ex. `'./dialog-portal'`).

## sheet/

Mesma forma de `dialog/` (mesmo primitivo `@base-ui/react/dialog`, renomeado `SheetPrimitive`).

| Símbolo atual | Novo local |
|---|---|
| `Sheet` (raiz) | `index.tsx` |
| `SheetTrigger`, `SheetClose`, `SheetPortal`, `SheetOverlay`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription` | `components/sheet-*.tsx`, um por símbolo |

`sheet.types.ts`: `SheetSide = 'top' | 'right' | 'bottom' | 'left'`, `SheetContentProps`.

## toast/

Único componente com duas raízes plausíveis — ambas ficam em `index.tsx` (research.md D1).

| Símbolo atual | Novo local |
|---|---|
| `Toast`, `Toaster` (raízes) | `index.tsx` |
| `createToastManager`, `toast` (singleton), `useToastManager` | `index.tsx` — reexportados como vêm do primitivo, não são tipo nem sub-parte de UI |
| `ToastProvider`, `ToastPortal`, `ToastViewport`, `ToastContent`, `ToastTitle`, `ToastDescription`, `ToastAction`, `ToastClose`, `ToastIcon`, `ToastList` | `components/toast-*.tsx`, um por símbolo |

`toast.types.ts`: `ToastIconProps = { type: string | undefined }` — tipo preservado exatamente como está
hoje (sem apertar para uma união de literais; isso seria uma mudança de comportamento de tipo fora do
escopo desta feature, ver FR-009).

Nota: `components/toast-list.tsx` usa `Toast` (importa de `'..'`, o `index.tsx` do próprio componente)
e `ToastContent`/`ToastIcon`/`ToastTitle`/`ToastDescription`/`ToastAction`/`ToastClose` (imports
relativos entre irmãos dentro de `components/`).

## dropdown-menu/

| Símbolo atual | Novo local |
|---|---|
| `DropdownMenu` (raiz) | `index.tsx` |
| `DropdownMenuPortal`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuItem`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuSeparator`, `DropdownMenuShortcut` | `components/dropdown-menu-*.tsx`, um por símbolo |

`dropdown-menu.types.ts`: `DropdownMenuLabelProps`, `DropdownMenuItemProps` (`inset?`, `variant?`),
`DropdownMenuSubTriggerProps` (`inset?`), `DropdownMenuCheckboxItemProps` (`inset?`),
`DropdownMenuRadioItemProps` (`inset?`).

Nota: `components/dropdown-menu-sub-content.tsx` importa `components/dropdown-menu-content.tsx` como
base (import relativo entre irmãos).

## combobox/

O mais rico dos 11 — 16 símbolos hoje, mais um hook.

| Símbolo atual | Novo local |
|---|---|
| `Combobox` (raiz) | `index.tsx` |
| `useComboboxAnchor` | `index.tsx` (research.md D4 — hook de uma linha, não vira sub-parte própria) |
| `ComboboxValue`, `ComboboxTrigger`, `ComboboxClear`, `ComboboxInput`, `ComboboxContent`, `ComboboxPaletteContent`, `ComboboxList`, `ComboboxItem`, `ComboboxGroup`, `ComboboxLabel`, `ComboboxCollection`, `ComboboxEmpty`, `ComboboxSeparator`, `ComboboxChips`, `ComboboxChip`, `ComboboxChipsInput` | `components/combobox-*.tsx`, um por símbolo |

`combobox.types.ts`: `ComboboxInputProps` (`showTrigger?`, `showClear?`), `ComboboxChipProps`
(`showRemove?`).

Notas de import: `components/combobox-input.tsx` importa `InputGroup`/`InputGroupAddon`/
`InputGroupButton`/`InputGroupInput` de `@/shared/ui/input-group` (alias absoluto, resolve sem mudança
por FR-005) e `ComboboxTrigger`/`ComboboxClear` do próprio `components/` (relativo entre irmãos);
`components/combobox-chip.tsx` importa `Button` de `@/shared/ui/button` (absoluto, inalterado).

## input-group/

| Símbolo atual | Novo local |
|---|---|
| `InputGroup` (raiz) | `index.tsx` |
| `InputGroupAddon`, `InputGroupButton`, `InputGroupText`, `InputGroupInput`, `InputGroupTextarea` | `components/input-group-*.tsx`, um por símbolo |

**Sem `input-group.types.ts`** — corrigido em 2026-09-17 para bater com a regra do FR-002/D9 ("só
existe quando há tipo próprio real"). O único candidato seria `VariantProps<typeof
inputGroupAddonVariants>` / `VariantProps<typeof inputGroupButtonVariants>`, mas esses ficam com o
`cva()` correspondente dentro de `components/input-group-addon.tsx` e `components/input-group-button.tsx`
(research.md D2) — não sobra tipo próprio para o arquivo de tipos conter. (Versão anterior deste
documento dizia que o arquivo existiria "enxuto"; essa frase contradizia a regra já aplicada aos 7
componentes atômicos sem tipo — corrigido para ficar consistente: mesma regra, mesmo resultado.)

`input-group.test.tsx` migra de `shared/ui/input-group.test.tsx` para a raiz da pasta, import ajustado
de `from './input-group'` para `from '.'` (research.md D5).

## kbd/

Adicionado em 2026-09-17 — classificado por engano como atômico na primeira versão deste documento
(contagem de linhas baixa levou a não conferir os exports reais). Mesma forma de `avatar/`/`card/`:
raiz + um dependente.

| Símbolo atual | Novo local |
|---|---|
| `Kbd` (raiz) | `index.tsx` |
| `KbdGroup` | `components/kbd-group.tsx` |

**Sem `kbd.types.ts`** — `Kbd` e `KbdGroup` usam só `React.ComponentProps<'kbd'|'div'>` diretamente,
sem prop própria. Mesmo caso de `input-group/`/`tooltip/`.

## tooltip/

| Símbolo atual | Novo local |
|---|---|
| `Tooltip` (raiz) | `index.tsx` |
| `TooltipProvider`, `TooltipTrigger`, `TooltipContent` | `components/tooltip-*.tsx`, um por símbolo |

**Sem `tooltip.types.ts`** — mesmo caso de `input-group/`: `TooltipContent`'s prop type é só uma
combinação `Pick<...>` de tipos que já existem no primitivo, sem nada bespoke para extrair.

## confirm-dialog/

Único componente de exportação única na lista — qualifica pela cláusula qualitativa do FR-004
(research.md D3).

| Símbolo/trecho atual | Novo local |
|---|---|
| `ConfirmDialog<T>` — `useState`, `handleConfirm`, escolha de view | `index.tsx` |
| Ramo JSX "bloqueado" (linhas 94–108 de hoje) | `components/confirm-dialog-blocked-view.tsx` |
| Ramo JSX "confirmação/falha passageira" (linhas 109–137 de hoje) | `components/confirm-dialog-confirm-view.tsx` |
| `ConfirmDialogFailure`, `ConfirmDialogConfirmation`, `ConfirmDialogError`, `ConfirmDialogSuccess`, `ConfirmDialogProps<T>` | `confirm-dialog.types.ts` |

Notas de import: `index.tsx` mantém `from '@/shared/ui/button'` e `from '@/shared/ui/dialog'` (absolutos,
inalterados) e ajusta os dois relativos existentes: `from '../api/servicesFacade'` →
`from '../../api/servicesFacade'`, `from './toast'` → `from '../toast'` (research.md D6).
`confirm-dialog.test.tsx` migra para a raiz, import ajustado de `from './confirm-dialog'` para
`from '.'`.

## Componentes atômicos (ganham pasta, sem `components/`)

Ampliado ao escopo em 2026-09-17 (research.md D9) — antes desta data, estes 9 permaneciam arquivo único.
Todos ganham `index.tsx`; só os dois marcados abaixo ganham `<nome>.types.ts` (têm tipo próprio real,
sem depender de nenhum `cva()` local — ver research.md D2/D9).

| Componente | `index.tsx` exporta | `<nome>.types.ts`? |
|---|---|---|
| `color-swatch-picker/` | `ColorSwatchPicker` | **Sim** — `ColorSwatchOption`, `ColorSwatchPickerProps` (já existem hoje como `interface` no próprio arquivo, sem depender de `cva`) |
| `FullScreenMessage/` | `FullScreenMessage` | **Sim** — `FullScreenMessageProps` (`{ title, description, action? }`, hoje inline). Pasta mantém a grafia PascalCase exata de hoje — não normalizada para kebab-case (FR-005, research.md D9) |
| `badge/` | `Badge` + `badgeVariants` (cva fica no `index.tsx`, junto do componente — D2) | Não — `VariantProps<typeof badgeVariants>` é o único tipo, e fica com o `cva()` no `index.tsx` |
| `button/` | `Button` + `buttonVariants` | Não — mesmo caso de `badge/` |
| `input/` | `Input` | Não — só repassa `React.ComponentProps<'input'>` |
| `label/` | `Label` | Não — só repassa `React.ComponentProps<'label'>` |
| `separator/` | `Separator` | Não — só repassa `SeparatorPrimitive.Props` do primitivo, sem adicionar nada |
| `skeleton/` | `Skeleton` | Não — só repassa `React.ComponentProps<'div'>` |
| `textarea/` | `Textarea` | Não — só repassa `React.ComponentProps<'textarea'>` |

Nenhum dos 9 tem import relativo hoje (todos usam só `@/shared/lib/utils` e, quando aplicável,
`@/shared/ui/button`/`input`/`textarea` — absolutos, inalterados por FR-005) — diferente de
`confirm-dialog`, nenhum precisa de ajuste de profundidade de import (research.md D6 continua valendo só
para `confirm-dialog`).

## Mapeamento de `vitest.config.ts` (`coverage.exclude`)

**Todas as 16 entradas** hoje existentes para `shared/ui/` mudam de arquivo exato para glob de pasta —
isso agora inclui os 9 atômicos, que antes da ampliação de escopo (research.md D9) ficariam inalterados.

| Entrada atual | Nova entrada | Motivo documentado (inalterado) |
|---|---|---|
| `src/shared/ui/avatar.tsx` | `src/shared/ui/avatar/**` | "Presentational cva wrappers with no logic of their own" |
| `src/shared/ui/badge.tsx` | `src/shared/ui/badge/**` | idem |
| `src/shared/ui/button.tsx` | `src/shared/ui/button/**` | idem |
| `src/shared/ui/card.tsx` | `src/shared/ui/card/**` | idem |
| `src/shared/ui/input.tsx` | `src/shared/ui/input/**` | idem |
| `src/shared/ui/kbd.tsx` | `src/shared/ui/kbd/**` | idem |
| `src/shared/ui/label.tsx` | `src/shared/ui/label/**` | idem |
| `src/shared/ui/separator.tsx` | `src/shared/ui/separator/**` | idem |
| `src/shared/ui/skeleton.tsx` | `src/shared/ui/skeleton/**` | idem |
| `src/shared/ui/textarea.tsx` | `src/shared/ui/textarea/**` | idem |
| `src/shared/ui/FullScreenMessage.tsx` | `src/shared/ui/FullScreenMessage/**` | idem (grafia PascalCase preservada) |
| `src/shared/ui/dialog.tsx` | `src/shared/ui/dialog/**` | "No consumer anywhere yet (T160 in tasks.md)" |
| `src/shared/ui/dropdown-menu.tsx` | `src/shared/ui/dropdown-menu/**` | "shadcn scaffold, sem consumidor real da parte não usada" (D5, ARCHITECTURE.md) |
| `src/shared/ui/combobox.tsx` | `src/shared/ui/combobox/**` | idem |
| `src/shared/ui/sheet.tsx` | `src/shared/ui/sheet/**` | idem |
| `src/shared/ui/toast.tsx` | `src/shared/ui/toast/**` | idem |

`input-group`, `tooltip`, `confirm-dialog` e `color-swatch-picker` não aparecem hoje na lista (cobertura
real, ver D5 de `docs/ARCHITECTURE.md`) e não ganham entrada nova — `src/**/*.test.{ts,tsx}`, já
presente na lista, cobre o teste migrado de cada um sem entrada própria.

> A nota `// No consumer anywhere yet (T160 in tasks.md)` acima de `dialog.tsx` já está desatualizada
> hoje — `confirm-dialog.tsx` importa `Dialog`/`DialogContent`/etc. Isso é uma inconsistência
> pré-existente, fora do escopo desta feature; **não** corrigir o texto do comentário como parte desta
> migração (só o caminho do arquivo), para não misturar uma correção de documentação não pedida dentro
> de um PR de reorganização de arquivo.

## Documentação a atualizar (FR-010)

1. **`docs/ARCHITECTURE.md` §1** — nova frase/bullet ao lado da já existente sobre páginas
   ("Sub-components go in a `components/` subfolder, created only when a page actually grows them"),
   descrevendo a mesma regra para `shared/ui/`: pasta para **todo** componente (`index.tsx` sempre;
   `<nome>.types.ts` e `components/` só quando há conteúdo real para cada um).
2. **`docs/ARCHITECTURE.md` §5** (tabela de decisões) — nova linha, mesmo padrão das linhas já
   existentes sobre `confirm-dialog` e `color-swatch-picker`, citando `specs/005-shared-ui-component-folders/`.
3. **Skill `agenza-ui-primitive`** — atualizar para apontar para a entrada acima em vez de duplicar a
   convenção. Localização física do arquivo da skill não encontrada em disco a partir deste projeto
   (research.md D8) — localizar antes de virar tarefa concreta.
