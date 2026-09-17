# Implementation Plan: Pastas por Componente Composto em shared/ui

**Branch**: `005-shared-ui-component-folders` | **Date**: 2026-09-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-shared-ui-component-folders/spec.md`

## Summary

Dar a **todos os 20 componentes** de `src/shared/ui/` uma pasta própria no lugar do arquivo único de
hoje, para que a pasta siga o mesmo padrão de pasta-por-unidade já usado em
`features/*/ui/pages/<Page>/`, sem parte de `shared/ui/` em pasta e parte em arquivo solto. Toda pasta
tem um `index.tsx` como ponto de entrada público (reexportando tudo que o arquivo já exporta hoje,
preservando `@/shared/ui/<nome>` sem mudança para nenhum consumidor). Os outros dois arquivos são
condicionais, não automáticos:

- `<nome>.types.ts` só existe quando há um tipo próprio real para extrair. 10 dos 20 ganham esse
  arquivo: 8 dos 11 componentes compostos — `avatar`, `card`, `combobox`, `confirm-dialog`, `dialog`,
  `dropdown-menu`, `sheet`, `toast` (`input-group`, `kbd` e `tooltip` não têm tipo próprio real, só
  `React.ComponentProps` ou variantes `cva` que ficam com o componente — ficam sem esse arquivo) — mais
  `color-swatch-picker` e `FullScreenMessage` (únicos atômicos com tipo próprio de verdade). Os outros 7
  atômicos (`badge`, `button`, `input`, `label`, `separator`, `skeleton`, `textarea`) ficam só com
  `index.tsx`.
- `components/` só existe para os 11 componentes compostos já identificados (`avatar`, `card`,
  `combobox`, `confirm-dialog`, `dialog`, `dropdown-menu`, `input-group`, `kbd`, `sheet`, `toast`,
  `tooltip`) — critério do FR-004, inalterado por esta ampliação de escopo.

A migração é puramente mecânica — mover JSX/lógica para o novo local, sem alterar comportamento — mas
três coisas precisam de atenção real: (1) os 4 imports relativos hoje existentes dentro de `shared/ui/`
mudam de profundidade quando o arquivo que os contém passa a viver uma pasta mais fundo; (2) a lista de
exclusão de cobertura em `vitest.config.ts` referencia as 16 entradas de `shared/ui/` por caminho de
arquivo exato e todas precisam virar glob de pasta; (3) `FullScreenMessage/` mantém a grafia PascalCase
de hoje — não normalizada para kebab-case, para não quebrar FR-005.

> **Notas de correção**: `kbd.tsx` entrou na lista de componentes compostos em 2026-09-17 — foi
> classificado por engano como atômico na versão inicial deste plano (contagem de linhas baixa, sem
> conferir os exports reais); exporta `Kbd` + `KbdGroup`, mesma forma de `avatar`/`card`. Na mesma data,
> o escopo foi ampliado de "só os compostos" (10, depois 11 com a correção do `kbd`) para "todos os 20",
> a pedido explícito do usuário, para seguir o padrão de pasta-por-unidade já usado no resto do projeto.
> Ver `data-model.md` para o mapeamento completo dos 9 atômicos.

## Technical Context

**Language/Version**: TypeScript ~6.0.3 (`strict` mode, ver Constitution Principle I), React 19.2.7

**Primary Dependencies**: `@base-ui/react` 1.8.0 (primitivos sem estilo por trás de todos os 11
componentes), `class-variance-authority` 0.7.1 (variantes de estilo em `input-group`), `clsx` +
`tailwind-merge` (via `cn()` em `shared/lib/utils`), `lucide-react` 1.41.0 (ícones), Tailwind CSS 4.1.0

**Storage**: N/A — sem dado persistido; a feature não toca `shared/api`, `shared/session` nem nenhum
repositório

**Testing**: Vitest 4.1.11 + `@testing-library/react` 16.3.0 (unit/component), Playwright 1.56.0 (e2e,
via `npx playwright test`). Cobertura via `@vitest/coverage-v8`, limiares em `vitest.config.ts`

**Target Platform**: SPA React servida por Vite 8, mesmo alvo de hoje — a feature não introduz nem
remove nenhuma superfície de execução

**Project Type**: Aplicação web single-page existente (`apps/admin-frontend` no monorepo) — a feature
reorganiza um único diretório (`src/shared/ui/`) dentro dela; nenhum novo projeto/pacote é criado

**Performance Goals**: N/A — reorganização de arquivo em tempo de build/desenvolvimento, sem efeito em
runtime (FR-009); nenhum orçamento de performance novo se aplica

**Constraints**: Preservar todo caminho de import externo (FR-005); preservar o status de
inclusão/exclusão de cobertura de cada componente (FR-008); zero mudança de comportamento/saída visual
(FR-009); todos os portões de CI hoje verdes continuam verdes (NFR-001)

**Scale/Scope**: 20 componentes ganham pasta (11 compostos com `components/`, 9 atômicos só com
`index.tsx` — 2 desses 9 também ganham `<nome>.types.ts`), ~61 sub-partes internas ao todo dentro dos 11
compostos (contagem exata em [data-model.md](./data-model.md)), 2 arquivos de teste colocalizados
migrados, ~15 arquivos consumidores fora de `shared/ui/` que não precisam de nenhuma alteração, 16
entradas de `vitest.config.ts` atualizadas (todas as que hoje existem para `shared/ui/`), 1 entrada nova
na tabela de decisões de `docs/ARCHITECTURE.md`. Escopo fica inteiro dentro de `apps/admin-frontend` —
nenhum outro app do monorepo nem o backend são tocados.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Aplica? | Avaliação |
|---|---|---|
| I. Strict TypeScript | Sim | PASS — mover/extrair tipos para `<nome>.types.ts` não afrouxa `strict`; nenhum `any` implícito pode ser introduzido pela extração (ver research.md, regra de que tipos derivados de `cva`/`VariantProps` ficam com o componente, não no arquivo de tipos, para não forçar um tipo mais fraco só para "caber" no arquivo de tipos). |
| II. Multi-Tenant Safety Server-Side | Não | N/A — nenhum dos 20 componentes lê tenant, token ou dado de cliente; são primitivos de apresentação. |
| III. Auth via identity-service | Não | N/A — não tocado. |
| IV. Generated OpenAPI Client Only | Não | N/A — `confirm-dialog` importa tipos de `shared/api/servicesFacade` hoje e continua importando exatamente os mesmos, só ajustando a profundidade do caminho relativo (ver research.md); nenhuma chamada nova a backend. |
| V. CI Quality Gates Non-Negotiable | Sim | PASS, com obrigação explícita — `tsc`, ESLint, Prettier, limiares de cobertura do Vitest e Playwright precisam continuar verdes. É o gate central desta feature; ver FR-008/NFR-001 e o mapeamento exato de `vitest.config.ts` em data-model.md. |
| VI. No Frontend Docker | Não | N/A — não tocado. |

Nenhuma violação. Nenhuma entrada de Complexity Tracking necessária.

**Re-check pós-Phase 1**: O desenho em [data-model.md](./data-model.md) não introduziu nada novo que
mude a tabela acima — nenhum dado de tenant, autenticação ou chamada a backend nova surgiu ao detalhar
o mapeamento arquivo-a-arquivo. O único ponto que toca um princípio diretamente (V, gates de CI) ganhou
tratamento concreto em data-model.md (mapeamento de `vitest.config.ts`) e em
[quickstart.md](./quickstart.md) (roteiro para provar que os gates continuam verdes). Gate continua
PASS.

## Project Structure

### Documentation (this feature)

```text
specs/005-shared-ui-component-folders/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output — mapeamento arquivo-a-arquivo de cada componente
├── quickstart.md         # Phase 1 output — roteiro de validação manual/CI
└── tasks.md              # Phase 2 output (/speckit-tasks — ainda não criado)
```

Sem `contracts/`: os 20 componentes são consumidos só dentro do próprio `apps/admin-frontend` (nenhum
outro serviço ou app do monorepo os importa); o contrato relevante é a própria assinatura TypeScript,
já verificada por `tsc --noEmit` (Constitution Principle I) — não há um formato de contrato adicional
(endpoint, schema de CLI, etc.) para documentar à parte.

### Source Code (repository root)

Estrutura atual (achatada) e estrutura alvo, restritas a `src/shared/ui/` — nenhum outro diretório do
repositório muda de forma:

```text
# Antes (20 arquivos achatados + 2 testes colocalizados)
src/shared/ui/
├── avatar.tsx
├── badge.tsx
├── button.tsx
├── card.tsx
├── color-swatch-picker.tsx
├── combobox.tsx
├── confirm-dialog.tsx
├── confirm-dialog.test.tsx
├── dialog.tsx
├── dropdown-menu.tsx
├── FullScreenMessage.tsx
├── input.tsx
├── input-group.tsx
├── input-group.test.tsx
├── kbd.tsx
├── label.tsx
├── separator.tsx
├── sheet.tsx
├── skeleton.tsx
├── textarea.tsx
├── toast.tsx
└── tooltip.tsx

# Depois — todo componente vira pasta; forma completa varia por conteúdo real (ver data-model.md)
src/shared/ui/
├── combobox/                          # composto — exemplo mais rico
│   ├── index.tsx                    # ponto de entrada público: Combobox (raiz) + reexporta components/* + useComboboxAnchor
│   ├── combobox.types.ts            # só tipos: ComboboxInputProps, ComboboxChipProps, etc.
│   └── components/
│       ├── combobox-value.tsx
│       ├── combobox-trigger.tsx
│       ├── combobox-clear.tsx
│       ├── combobox-input.tsx
│       ├── combobox-content.tsx
│       ├── combobox-palette-content.tsx
│       ├── combobox-list.tsx
│       ├── combobox-item.tsx
│       ├── combobox-group.tsx
│       ├── combobox-label.tsx
│       ├── combobox-collection.tsx
│       ├── combobox-empty.tsx
│       ├── combobox-separator.tsx
│       ├── combobox-chips.tsx
│       ├── combobox-chip.tsx
│       └── combobox-chips-input.tsx
├── confirm-dialog/                    # composto — exportação única, mas complexo (FR-004, cláusula qualitativa)
│   ├── index.tsx                    # ConfirmDialog<T> — mantém useState/handleConfirm, escolhe a view
│   ├── confirm-dialog.types.ts      # ConfirmDialogProps, ConfirmDialogFailure, ConfirmDialogConfirmation, ConfirmDialogError, ConfirmDialogSuccess
│   ├── confirm-dialog.test.tsx      # migrado de shared/ui/confirm-dialog.test.tsx, import ajustado para '.'
│   └── components/
│       ├── confirm-dialog-blocked-view.tsx
│       └── confirm-dialog-confirm-view.tsx
├── color-swatch-picker/               # atômico, mas com tipo próprio real — ganha types.ts, sem components/
│   ├── index.tsx                    # ColorSwatchPicker
│   └── color-swatch-picker.types.ts # ColorSwatchOption, ColorSwatchPickerProps
├── button/                            # atômico, sem tipo próprio (buttonVariants fica com o componente)
│   └── index.tsx                    # Button + buttonVariants — sem types.ts, sem components/
└── … (avatar/, card/, dialog/, dropdown-menu/, input-group/, kbd/, sheet/, toast/, tooltip/,
      FullScreenMessage/, badge/, input/, label/, separator/, skeleton/, textarea/ — mesma lógica,
      detalhe completo em data-model.md)
```

**Structure Decision**: Migração no lugar dentro do mesmo app (`apps/admin-frontend`), sem novo
projeto/pacote. **Todos os 20** componentes ganham pasta própria (FR-001, ampliado em 2026-09-17 a
pedido do usuário para cobrir também os atômicos, seguindo o mesmo padrão de pasta-por-unidade de
`features/*/ui/pages/<Page>/`). Dentro disso, dois arquivos continuam condicionais, no mesmo espírito
que já valia para `components/`: o componente qualificado pelo FR-004 (11, lista em `spec.md`
§Assumptions) também ganha `components/`; qualquer componente com tipo próprio real (8 dos 11 compostos
— todos menos `input-group`, `kbd` e `tooltip` — mais `color-swatch-picker` e `FullScreenMessage`, 10 no
total) também ganha `<nome>.types.ts`. O mapeamento completo
arquivo-a-arquivo, incluindo os 4 imports relativos que mudam de profundidade e as 16 entradas de
`vitest.config.ts` a atualizar, está em [data-model.md](./data-model.md).

## Complexity Tracking

*Sem violações de constituição — seção não se aplica.*
