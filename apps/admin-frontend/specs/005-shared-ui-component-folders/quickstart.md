# Quickstart: Validando a reorganização de shared/ui

Roteiro para provar que a migração descrita em [data-model.md](./data-model.md) não mudou nenhum
comportamento (FR-009) e não quebrou nenhum portão de CI (NFR-001). Rode da raiz de
`apps/admin-frontend`.

## Pré-requisitos

- Migração de pelo menos um componente já aplicada (ex. `combobox/` ou `confirm-dialog/`, os dois
  citados nas Acceptance Scenarios da spec).
- Dependências instaladas (`npm install` na raiz do monorepo).
- Para os passos manuais (seção 4): stack do Aspire rodando, como em qualquer verificação de UI deste
  app (ver `README.md`).

## 1. Verificação estática — sem precisar do Aspire

Cada comando abaixo já existia antes desta feature; nenhum deles ganhou flag novo.

```bash
npx tsc --noEmit
```

Prova a parte mais barata primeiro: os 4 imports relativos que mudam de profundidade
(research.md D6) e qualquer sub-parte esquecida fora de `components/` aparecem aqui como erro de
caminho não encontrado, antes de rodar qualquer teste.

```bash
npm run lint
npm run format:check
```

`lint` confirma que nenhuma sub-parte de `components/` passou a ser importada de fora da pasta do seu
componente (FR-006) — o bloco `no-restricted-imports` de `eslint.config.js` já cobre `shared/**`, mas
não tem regra específica para "dentro de `components/`"; controle real aqui é revisão de código, não
uma regra automática nova.

## 2. Testes e cobertura

```bash
npm run test:coverage
```

Dois testes hoje colocalizados migram junto (`confirm-dialog/confirm-dialog.test.tsx`,
`input-group/input-group.test.tsx`) e devem passar sem nenhuma alteração de asserção — só o import do
componente sob teste muda, de `from './confirm-dialog'` para `from '.'` (research.md D5).

Confirme os limiares do `vitest.config.ts` (85% linhas/funções/statements, 80% branches) continuam
batendo — isso valida ao mesmo tempo o mapeamento de `coverage.exclude` em data-model.md: se um
componente que devia continuar excluído passar a contar (ou vice-versa), o número de cobertura muda de
um jeito perceptível, mesmo sem nenhum teste novo escrito.

## 3. Drift de tipos gerados

```bash
npm run generate:api-types:check
```

Não deveria acusar nada — esta feature não toca contrato de backend nem `shared/api/generated/`. Rodar
mesmo assim é a prova de que "reorganizar arquivo" não teve efeito colateral em nada gerado.

## 4. Ponta a ponta — as 3 User Stories, contra o app real

Com o Aspire de pé (`npm run dev` orquestrado por ele, porta 5173):

**User Story 1 (achar uma sub-parte sem abrir o arquivo inteiro)** — validação de código, não de tela:
abra `src/shared/ui/combobox/components/combobox-chip.tsx` e confirme que é o único arquivo que precisa
ser aberto para entender/alterar o chip removível do combobox.

**User Story 2 (ler o contrato de tipos)** — abra `src/shared/ui/confirm-dialog/confirm-dialog.types.ts`
sozinho e confirme que dá para responder "quais props o `ConfirmDialog` aceita?" sem abrir `index.tsx`.

**User Story 3 (comportamento em tela, zero regressão)** — como não há nenhuma sub-parte nova para
demonstrar (é reorganização, não feature nova), a prova é a ausência de mudança:

1. Login → `/tags`. Criar uma tag, editar, e excluir uma (exercita `confirm-dialog/`, `dialog/` por
   baixo do `input-group/` de busca, e o `toast/` de sucesso) — mesmas 3 telas de confirmação descritas
   em `specs/004-shared-confirm-dialog/spec.md`, resultado visual idêntico.
2. Abrir o menu de tema (`ThemeToggle`, no cabeçalho) — exercita `dropdown-menu/`.
3. Abrir a paleta de comando (atalho já documentado em `ShortcutHelpSheet`) — exercita `combobox/` (o
   `ComboboxPaletteContent`) e `sheet/` (o próprio `ShortcutHelpSheet`).

Em todos os três, o resultado esperado é "nada perceptível mudou" — a tela, o foco, a animação e o
texto são pixel-a-pixel os mesmos de antes da migração. Qualquer diferença visual é regressão de FR-009,
não uma melhoria incidental a manter.

## 5. Playwright (gate final)

```bash
npm run test:e2e
```

Já cobre parte dos fluxos acima (login semeado, sem mocks, contra o stack Aspire real — Constitution
Principle V). Passar sem nenhuma alteração de spec de teste é a confirmação mais forte de FR-009: os
mesmos cenários, escritos antes desta feature existir, continuam passando.
