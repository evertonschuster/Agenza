# Implementation Plan: Admin Panel UI Foundation

**Feature**: `002-ui-foundation` · **Spec**: [spec.md](./spec.md) · **Created**: 2026-09-04

## Summary

Substitui o shell provisório (`AppLayout` + `HomePage`) por uma fundação de UI completa: sistema de
tokens em dois temas, tema de três estados com handoff para o identity-service, camada de primitivos
sobre Base UI, shell responsivo com barra lateral e barra inferior, seis destinos de navegação, e um
sistema de atalhos com paleta de comandos. Nenhuma tela de negócio é construída aqui.

## Constitution Check

| Princípio | Impacto |
| --- | --- |
| I — Strict TypeScript | Mantido. `exactOptionalPropertyTypes` exige passe de tipagem em cada primitivo adicionado. |
| II — Multi-tenant server-side | Não tocado. Nenhuma tela nova consome API. |
| III — identity-service, portas fixas | Tocado de forma restrita: `login.css` e o parâmetro de tema da ADR 0020. Portas inalteradas. |
| IV — Cliente OpenAPI gerado | Não tocado. `generate:api-types:check` segue no CI. |
| V — Portões de CI | Mantidos. Uma alteração deliberada em `coverage.exclude`, registrada abaixo. |
| VI — Sem Docker no frontend | Mantido. |
| Deferred: "UI component library" | **Encerrado** por esta feature — ADR 0039. |

## Key Decisions

### D1 — Base UI substitui Radix (ADR 0039)

`@base-ui/react@^1.8.0` no lugar de `radix-ui@1.6.7`. Motivos: é o padrão do shadcn/ui desde julho de
2026, então `npx shadcn add` permanece no caminho suportado; um pacote único cobre Toast e Combobox,
eliminando `sonner` e `cmdk`; e o custo de migração é hoje **um arquivo** — `button.tsx` é o único
consumidor de Radix e será reescrito de qualquer forma.

Radix não foi depreciado. A troca é oportunista, não corretiva, e o momento é o mais barato que
existirá.

**Diferença de API que quebra código copiado**: Base UI usa a prop `render`; Radix usa `asChild` +
`Slot`. Snippets de tutoriais Radix não compilam. Usar sempre a aba Base UI da documentação.

### D2 — Tema escrito à mão em `shared/theme/` (ADR 0040)

`next-themes` carrega maquinário de SSR que este SPA não tem e possui incompatibilidades abertas com
React 19. A alternativa é ~60 linhas espelhando `shared/session/sessionStore.ts`, que já implementa
exatamente o padrão snapshot/subscribe/`useSyncExternalStore` necessário.

Fica em `shared/` e não em `features/`, porque `features/auth` precisa ler o tema para enviá-lo ao
identity-service, e `features → shared` é a única direção permitida.

Chave de armazenamento `admin-theme` e atributo `data-theme`, **idênticos** aos que
`identity-service/wwwroot/js/theme-init.js` já usa — é o que torna o handoff possível.

### D3 — Sem biblioteca de animação

CSS `transition` + `@starting-style` + os atributos `data-*` de estado do Base UI. `motion` custa
~31 KB gzip no build React, e a persona usa Android intermediário. Reavaliar apenas se uma animação
de layout específica exigir.

### D4 — Regra de evidência de atalhos

> Um keycap em repouso só pode aparecer num controle que ocorre **no máximo uma vez por tela**.

O benefício da descoberta é uma vez por usuário; o custo do ruído é por instância, para sempre.

| Nível | Onde | Como |
| --- | --- | --- |
| A | Controle de busca do cabeçalho; ação primária única da tela; confirmar de diálogo | keycap em repouso, no slot final, nunca dentro do rótulo |
| B | Botões de ícone e ações secundárias com atalho | tooltip em hover **e** foco, 250 ms |
| C | Todo o resto que tem atalho | apenas paleta, trilho do menu e folha `?` |
| D | Sem atalho | nada |

Sem prop `shortcut` no `Button` genérico: o chip vive em três componentes e é **derivado do registro
de atalhos**, nunca digitado à mão. Isso torna estruturalmente impossível anunciar um atalho inexistente.

### D5 — Cobertura mede lógica, não marcação

`src/shared/ui/**` entra em `coverage.exclude`. Primitivos apresentativos com `cva` não têm lógica a
testar e derrubariam o percentual, empurrando o time a escrever testes cerimoniais. Em contrapartida,
`shared/theme/**`, `shared/keyboard/**` e a lógica de navegação e anúncio de rota são testados de
verdade.

**Esta alteração é feita antes de qualquer primitivo ser adicionado**, ou o CI fica vermelho e parece
regressão.

### D6 — Telas "Em breve" moram em `app/`, não em `features/`

Não têm `model` nem `api`, portanto não atendem à definição de fatia do `ARCHITECTURE.md` §1 — o mesmo
critério pelo qual `HomePage` mora em `app/` hoje. Cada uma é substituída por uma fatia real quando o
backend existir.

## Dependencies

### Adicionar

| Pacote | Versão | Para quê |
| --- | --- | --- |
| `@base-ui/react` | `^1.8.0` | Dialog, Popover, Select, Menu, Tooltip, Tabs, Switch, Toast, Combobox |
| `lucide-react` | latest | Ícones; melhor relação bundle/fonte da categoria (~1.0–1.2x contra 16–18x do Phosphor) |
| `@fontsource-variable/inter` | latest | Inter self-hosted; a tela de login já usa Inter |
| `axe-core` (dev) | latest | Base do helper de a11y nos testes |
| `@axe-core/playwright` (dev) | latest | Auditoria a11y no e2e contra o stack real |

### Remover

`radix-ui` — após `button.tsx` ser reescrito.

### Deliberadamente não adotar

`sonner` (Base UI Toast) · `cmdk` (Base UI Combobox) · `next-themes` (D2) · `motion` (D3) ·
`vaul` (Base UI Dialog como sheet) · `react-hotkeys-hook` (registro próprio) ·
`@tanstack/react-table` (sem tela de tabela ainda) · `react-hook-form` + `zod` (entram com o primeiro
formulário real, não com a fundação).

## Structure

```
src/
├── app/
│   ├── globals.css                  reescrito
│   ├── routes.tsx                   seis rotas
│   ├── shell/                       NOVO — composition root do layout
│   │   ├── AppShell.tsx  SidebarNav.tsx  BottomNav.tsx  AppHeader.tsx
│   │   ├── ThemeToggle.tsx  SkipLink.tsx  RouteAnnouncer.tsx
│   │   ├── CommandPalette.tsx  ShortcutHelpSheet.tsx
│   │   └── navigation.ts            destinos como dado
│   └── pages/                       NOVO — telas sem fatia
│       ├── ComingSoon.tsx
│       └── Inicio.tsx  Agenda.tsx  Clientes.tsx  Conversas.tsx  Servicos.tsx  Ajustes.tsx
└── shared/
    ├── theme/                       NOVO — theme.ts  themeStore.ts  useTheme.ts
    ├── keyboard/                    NOVO — shortcuts.ts  useShortcut.ts  platform.ts
    ├── hooks/                       NOVO — declarado em components.json, nunca criado
    └── ui/                          conjunto de fundação
```

Direção de dependência inalterada: `app → features → shared`. `app/shell/` usa `useAuth` de
`@/features/auth` e os stores de `@/shared/*`; nada em `shared/` importa `app/` ou `features/`.

## Phasing

Cada fase termina com CI verde. Ordem é dependência real, não preferência.

| Fase | Entrega | Bloqueia |
| --- | --- | --- |
| 1 | Tokens, tema, tipografia, handoff com identity-service | tudo |
| 2 | Camada de primitivos (Base UI in, Radix out) + ajuste de cobertura | 3, 4, 5 |
| 3 | Shell responsivo + acessibilidade do shell | 4, 5 |
| 4 | Seis rotas + telas "Em breve" | 5 |
| 5 | Atalhos, paleta de comandos, evidência | — |
| 6 | Portões automatizados de a11y + documentação + ADRs | — |

## Risks

| Risco | Mitigação |
| --- | --- |
| `npm ci` quebra no CI após adicionar dependências | Regerar o lockfile em container Linux (`npm install --package-lock-only --ignore-scripts`) num passo próprio ao fim da Fase 2 |
| `exactOptionalPropertyTypes` atrita com componentes gerados pelo shadcn | Passe de tipagem por componente; esperado, não eventual |
| Gate de cobertura fica vermelho ao adicionar primitivos | D5 é feito **antes** de qualquer primitivo |
| Chip de atalho sobre o violeta lê como botão dentro de botão | Revisar a 100% de zoom em Windows 1366×768 real; se a borda não sobreviver, enviar sem chip — nível B mais a linha na paleta ainda supera o estado atual |
| Snippet Radix copiado não compila com Base UI | Skill `agenza-ui-primitive` documenta a diferença `render` vs `asChild` |
| Regressão silenciosa de nome acessível | Teste que afirma que o nome computado do CTA primário é igual ao rótulo visível |

## Verification

Ver [`checklists/acceptance.md`](./checklists/acceptance.md) e a seção de verificação de
[`tasks.md`](./tasks.md).
