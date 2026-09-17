# Phase 1 Data Model: Pastas por Componente Composto em shared/ui

Esta feature não tem entidade de domínio — o "modelo" aqui é estrutural: qual arquivo existe, o que ele
exporta, e de quem ele depende. Este documento é o mapeamento completo, componente a componente,
**já refletindo a revisão pós-implementação de 2026-09-17** (research.md D10) — a primeira
implementação (D1–D9) deu um arquivo a cada sub-parte sem exceção e uma pasta a todo componente sem
exceção; uma revisão encontrou 19 arquivos de ≤10 linhas e 7 pastas sem nenhum conteúdo real, e as duas
regras foram apertadas. O resultado final tem 60 arquivos (era 112).

Convenção final (research.md D1–D2, D4, D9, D10):

- **Pasta**: só existe para um componente que se qualifica pelo critério de `components/` (mais de um
  export fortemente acoplado, ou um único export complexo o bastante) **ou** tem pelo menos um tipo
  próprio real para extrair. Um componente de exportação única, sem tipo, sem essa complexidade,
  permanece arquivo único na raiz de `shared/ui/`.
- `index.tsx` — sempre presente numa pasta que existe; ponto de entrada público, exporta o(s)
  componente(s)-raiz e reexporta tudo de `components/`. Único arquivo que muda com `@/shared/ui/<nome>`
  de fora.
- `<nome>.types.ts` — presente só quando há tipo próprio real; nunca uma chamada `cva()` (fica com o
  componente que a usa).
- `components/<sub-parte>.tsx` — um arquivo próprio só para a sub-parte com peso real: composição de
  outros componentes, estado/handler/ref próprios, ou classe longa o bastante para justificar
  isolamento mesmo sem lógica em JS.
- `components/<nome>-primitives.tsx` — as sub-partes triviais do mesmo componente (wrapper de um
  elemento primitivo, classe estática ou só orientada por seletor CSS, sem composição, sem condicional
  em JS), todas juntas num arquivo só.

## avatar/ — 1 arquivo

Todas as 6 sub-partes são wrapper de um elemento só, sem composição, sem condicional em JS — nenhuma
tem peso real. Dissolve inteiramente em `index.tsx`, sem `components/` nenhum. `AvatarSize` volta a
ser um tipo inline (não há mais `avatar.types.ts`) pela mesma razão: um alias de 3 opções não é tipo
"real" o bastante para merecer arquivo próprio, mesma régua já aplicada a `input-group`/`tooltip`.

| Símbolo | Local |
|---|---|
| `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarBadge`, `AvatarGroup`, `AvatarGroupCount` | `index.tsx` |

## card/ — 1 arquivo

Mesmo caso de `avatar/`: as 7 sub-partes são todas wrapper de um `<div>` com classe estática. Dissolve
em `index.tsx`; `CardSize` volta a ser tipo inline.

| Símbolo | Local |
|---|---|
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter` | `index.tsx` |

## kbd/ — 1 arquivo

`KbdGroup` é um wrapper trivial de `<div>`. Dissolve em `index.tsx`.

| Símbolo | Local |
|---|---|
| `Kbd`, `KbdGroup` | `index.tsx` |

## tooltip/ — 3 arquivos

`TooltipContent` compõe `Portal`+`Positioner`+`Popup`+`Arrow` — peso real, isolado. `Provider` e
`Trigger` são wrappers triviais — agrupados.

| Símbolo | Local |
|---|---|
| `Tooltip` (raiz) | `index.tsx` |
| `TooltipContent` | `components/tooltip-content.tsx` |
| `TooltipProvider`, `TooltipTrigger` | `components/tooltip-primitives.tsx` |

Sem `tooltip.types.ts` — o tipo de `TooltipContent` é só uma combinação `Pick<...>` do primitivo, sem
nada bespoke.

## dialog/ — 5 arquivos

`DialogContent` compõe `Portal`+`Overlay`+botão de fechar condicional; `DialogFooter` tem o botão de
fechar condicional. Os outros 7 são wrappers triviais (elemento único, classe estática ou sem classe).

| Símbolo | Local |
|---|---|
| `Dialog` (raiz) | `index.tsx` |
| `DialogContent` | `components/dialog-content.tsx` (importa `DialogPortal`/`DialogOverlay` de `./dialog-primitives`) |
| `DialogFooter` | `components/dialog-footer.tsx` |
| `DialogTrigger`, `DialogPortal`, `DialogClose`, `DialogOverlay`, `DialogHeader`, `DialogTitle`, `DialogDescription` | `components/dialog-primitives.tsx` |

`dialog.types.ts`: `DialogContentProps`, `DialogFooterProps` (ambos `{ showCloseButton?: boolean }`
sobre o tipo do primitivo correspondente).

## sheet/ — 4 arquivos

Mesma forma de `dialog/` (mesmo primitivo `@base-ui/react/dialog`, renomeado `SheetPrimitive`).
`SheetContent` tem variantes de `side` + botão de fechar condicional — peso real. Os outros 8 são
wrappers triviais (incluindo `SheetFooter`, que aqui — diferente de `DialogFooter` — não tem nenhum
condicional).

| Símbolo | Local |
|---|---|
| `Sheet` (raiz) | `index.tsx` |
| `SheetContent` | `components/sheet-content.tsx` (importa `SheetPortal`/`SheetOverlay` de `./sheet-primitives`) |
| `SheetTrigger`, `SheetClose`, `SheetPortal`, `SheetOverlay`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription` | `components/sheet-primitives.tsx` |

`sheet.types.ts`: `SheetSide`, `SheetContentProps`.

## toast/ — 5 arquivos

`ToastIcon` tem lógica real (if-chain mapeando `type` → ícone); `ToastList` usa hook
(`useToastManager`) e compõe 6 outros componentes — os dois com peso real, isolados. `Toast` e
`Toaster` (as duas raízes — research.md D1) ficam em `index.tsx`. Os 8 restantes são wrappers triviais.

| Símbolo | Local |
|---|---|
| `Toast`, `Toaster` (raízes) | `index.tsx` |
| `createToastManager`, `toast` (singleton), `useToastManager` | `index.tsx` — reexportados do primitivo |
| `ToastIcon` | `components/toast-icon.tsx` |
| `ToastList` | `components/toast-list.tsx` (importa `Toast` de `'..'`, os 5 seguintes de `./toast-primitives`) |
| `ToastProvider`, `ToastPortal`, `ToastViewport`, `ToastContent`, `ToastTitle`, `ToastDescription`, `ToastAction`, `ToastClose` | `components/toast-primitives.tsx` |

`toast.types.ts`: `ToastIconProps = { type: string \| undefined }` — preservado exatamente como está
hoje (FR-009).

## dropdown-menu/ — 9 arquivos

`Content` (composição Portal+Positioner+Popup), `Item`/`SubTrigger` (classe muito longa, justifica
isolamento mesmo sem condicional em JS), `SubContent` (compõe `Content`), `CheckboxItem`/`RadioItem`
(compõem indicador+ícone+children) têm peso real. Os outros 8 são triviais.

| Símbolo | Local |
|---|---|
| `DropdownMenu` (raiz) | `index.tsx` |
| `DropdownMenuContent` | `components/dropdown-menu-content.tsx` |
| `DropdownMenuItem` | `components/dropdown-menu-item.tsx` |
| `DropdownMenuSubTrigger` | `components/dropdown-menu-sub-trigger.tsx` |
| `DropdownMenuSubContent` | `components/dropdown-menu-sub-content.tsx` (importa `dropdown-menu-content.tsx`) |
| `DropdownMenuCheckboxItem` | `components/dropdown-menu-checkbox-item.tsx` |
| `DropdownMenuRadioItem` | `components/dropdown-menu-radio-item.tsx` |
| `DropdownMenuPortal`, `DropdownMenuTrigger`, `DropdownMenuGroup`, `DropdownMenuLabel`, `DropdownMenuSub`, `DropdownMenuRadioGroup`, `DropdownMenuSeparator`, `DropdownMenuShortcut` | `components/dropdown-menu-primitives.tsx` |

`dropdown-menu.types.ts`: `DropdownMenuLabelProps`, `DropdownMenuItemProps`, `DropdownMenuSubTriggerProps`,
`DropdownMenuCheckboxItemProps`, `DropdownMenuRadioItemProps`.

## combobox/ — 10 arquivos

O mais rico. `Trigger`/`Clear` (compõem ícone+classe), `Input` (compõe `InputGroup` inteiro + lógica
condicional), `Content`/`PaletteContent` (composição de Portal/Positioner/Popup; `PaletteContent`
também usa `useRef`), `Item`/`Chip` (compõem indicador/ícone + condicional) têm peso real. Os outros 9
são triviais.

| Símbolo | Local |
|---|---|
| `Combobox` (raiz), `useComboboxAnchor` (hook de uma linha — research.md D4) | `index.tsx` |
| `ComboboxTrigger` | `components/combobox-trigger.tsx` |
| `ComboboxClear` | `components/combobox-clear.tsx` |
| `ComboboxInput` | `components/combobox-input.tsx` (importa `InputGroup*` de `@/shared/ui/input-group`, `Trigger`/`Clear` de siblings) |
| `ComboboxContent` | `components/combobox-content.tsx` |
| `ComboboxPaletteContent` | `components/combobox-palette-content.tsx` |
| `ComboboxItem` | `components/combobox-item.tsx` |
| `ComboboxChip` | `components/combobox-chip.tsx` (importa `Button` de `@/shared/ui/button`) |
| `ComboboxValue`, `ComboboxList`, `ComboboxGroup`, `ComboboxLabel`, `ComboboxCollection`, `ComboboxEmpty`, `ComboboxSeparator`, `ComboboxChips`, `ComboboxChipsInput` | `components/combobox-primitives.tsx` |

`combobox.types.ts`: `ComboboxInputProps`, `ComboboxChipProps`.

## input-group/ — 5 arquivos

`InputGroupAddon` (handler de foco no clique) e `InputGroupButton` (variantes `cva` + tipo `Omit<>`)
têm peso real. `Text`/`Input`/`Textarea` são wrappers triviais de um elemento (ou de `Input`/`Textarea`
de `shared/ui`).

| Símbolo | Local |
|---|---|
| `InputGroup` (raiz) | `index.tsx` |
| `InputGroupAddon` | `components/input-group-addon.tsx` |
| `InputGroupButton` | `components/input-group-button.tsx` |
| `InputGroupText`, `InputGroupInput`, `InputGroupTextarea` | `components/input-group-primitives.tsx` |

Sem `input-group.types.ts` — os únicos candidatos (`VariantProps` dos dois `cva()`) ficam com o
componente que os usa.

`input-group.test.tsx` migra para a raiz da pasta, import ajustado para `from '.'`.

## confirm-dialog/ — 5 arquivos (inalterado pela revisão)

Único componente de exportação única com pasta — qualifica pela cláusula qualitativa do FR-004
(research.md D3). As duas views JÁ eram uma segregação com peso real (JSX distinto, não wrappers
triviais) — não fazem parte da revisão de D10.

| Símbolo/trecho | Local |
|---|---|
| `ConfirmDialog<T>` — `useState`, `handleConfirm`, escolha de view | `index.tsx` |
| Ramo "bloqueado" | `components/confirm-dialog-blocked-view.tsx` |
| Ramo "confirmação/falha passageira" | `components/confirm-dialog-confirm-view.tsx` |
| `ConfirmDialogFailure`, `ConfirmDialogConfirmation`, `ConfirmDialogError`, `ConfirmDialogSuccess`, `ConfirmDialogProps<T>`, `ConfirmDialogBlockedViewProps`, `ConfirmDialogConfirmViewProps` | `confirm-dialog.types.ts` |

Imports ajustados (research.md D6): `from '../api/servicesFacade'` → `from '../../api/servicesFacade'`,
`from './toast'` → `from '../toast'`. `confirm-dialog.test.tsx` migra para a raiz, import para `from '.'`.

## Componentes que permanecem arquivo único — 7 arquivos

Exportação única, sem tipo próprio real, sem complexidade — não se qualificam nem pelo critério de
`components/` nem pelo de `types.ts`, então não ganham pasta (FR-001 revisado, D10).

| Componente | Por quê |
|---|---|
| `badge.tsx` | `Badge` + `badgeVariants` (cva fica junto do componente) |
| `button.tsx` | `Button` + `buttonVariants`, mesmo caso |
| `input.tsx` | só repassa `React.ComponentProps<'input'>` |
| `label.tsx` | só repassa `React.ComponentProps<'label'>` |
| `separator.tsx` | só repassa o tipo do primitivo |
| `skeleton.tsx` | só repassa `React.ComponentProps<'div'>` |
| `textarea.tsx` | só repassa `React.ComponentProps<'textarea'>` |

## Componentes de exportação única que ganham pasta — 2 arquivos cada

Diferente dos 7 acima: exportação única, mas **com** tipo próprio real — qualificam pelo critério de
`types.ts` do FR-001/FR-002, mesmo sem `components/`.

| Componente | `index.tsx` exporta | `<nome>.types.ts` |
|---|---|---|
| `color-swatch-picker/` | `ColorSwatchPicker` | `ColorSwatchOption`, `ColorSwatchPickerProps` |
| `FullScreenMessage/` (grafia PascalCase preservada — FR-005) | `FullScreenMessage` | `FullScreenMessageProps` |

## Mapeamento de `vitest.config.ts` (`coverage.exclude`)

Das 16 entradas hoje existentes para `shared/ui/`, **9 viram glob de pasta** (os componentes que
ganharam pasta e já estavam na lista) e **7 continuam apontando para o arquivo exato** (os que
permanecem arquivo único).

| Entrada atual | Nova entrada | Motivo documentado (inalterado) |
|---|---|---|
| `src/shared/ui/avatar.tsx` | `src/shared/ui/avatar/**` | "Presentational cva wrappers with no logic of their own" |
| `src/shared/ui/card.tsx` | `src/shared/ui/card/**` | idem |
| `src/shared/ui/kbd.tsx` | `src/shared/ui/kbd/**` | idem |
| `src/shared/ui/FullScreenMessage.tsx` | `src/shared/ui/FullScreenMessage/**` | idem (grafia PascalCase preservada) |
| `src/shared/ui/badge.tsx` | **inalterada** | idem |
| `src/shared/ui/button.tsx` | **inalterada** | idem |
| `src/shared/ui/input.tsx` | **inalterada** | idem |
| `src/shared/ui/label.tsx` | **inalterada** | idem |
| `src/shared/ui/separator.tsx` | **inalterada** | idem |
| `src/shared/ui/skeleton.tsx` | **inalterada** | idem |
| `src/shared/ui/textarea.tsx` | **inalterada** | idem |
| `src/shared/ui/dialog.tsx` | `src/shared/ui/dialog/**` | "No consumer anywhere yet (T160 in tasks.md)" |
| `src/shared/ui/dropdown-menu.tsx` | `src/shared/ui/dropdown-menu/**` | "shadcn scaffold, sem consumidor real da parte não usada" (D5, ARCHITECTURE.md) |
| `src/shared/ui/combobox.tsx` | `src/shared/ui/combobox/**` | idem |
| `src/shared/ui/sheet.tsx` | `src/shared/ui/sheet/**` | idem |
| `src/shared/ui/toast.tsx` | `src/shared/ui/toast/**` | idem |

`input-group`, `tooltip`, `confirm-dialog` e `color-swatch-picker` não aparecem hoje na lista (cobertura
real, ver D5 de `docs/ARCHITECTURE.md`) e não ganham entrada nova.

> A nota `// No consumer anywhere yet (T160 in tasks.md)` acima de `dialog.tsx` já está desatualizada
> hoje — `confirm-dialog.tsx` importa `Dialog`/`DialogContent`/etc. Inconsistência pré-existente, fora
> do escopo desta feature; não corrigida aqui.

## Documentação a atualizar (FR-010)

1. **`docs/ARCHITECTURE.md` §1** — regra para `shared/ui/`: pasta só quando o componente se qualifica
   (critério de `components/` ou de `types.ts`); dentro da pasta, sub-parte só ganha arquivo próprio
   quando tem peso real, senão vai para `<nome>-primitives.tsx`.
2. **`docs/ARCHITECTURE.md` §5** — nova linha na tabela de decisões, citando `specs/005-shared-ui-component-folders/`.
3. **Skill `agenza-ui-primitive`** — apontar para a entrada acima. Arquivo físico não localizado em
   disco a partir deste projeto (research.md D8) — pendente.
