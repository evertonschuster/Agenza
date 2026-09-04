# Tasks: Admin Panel UI Foundation

**Input**: [spec.md](./spec.md), [plan.md](./plan.md) · **Feature**: `002-ui-foundation`

## Format: `[ID] [P?] [Story] Descrição`

- **[P]** — pode rodar em paralelo (arquivos distintos, sem dependência entre si)
- **[Story]** — a user story do `spec.md` que a tarefa serve (US1–US5), ou `FND` para fundação
- Caminhos são relativos a `apps/admin-frontend/` salvo quando indicado

> **Este arquivo é o estado de retomada.** Uma tarefa só é marcada quando está feita *e* verificada.
> Ao retomar uma sessão interrompida, a primeira caixa não marcada é o ponto de partida — não é
> preciso reconstruir contexto a partir da conversa.

---

## Fase 0 — Ambiente de desenvolvimento (fora do escopo da feature)

Infraestrutura que habilita as demais fases. Rastreada aqui para visibilidade; entregue fora do
fluxo Spec Kit por não ser produto.

- [x] T001 `AGENTS.md` na raiz e em `apps/admin-frontend/`, com `CLAUDE.md` como import fino e
      `.github/copilot-instructions.md` como ponte
- [x] T002 [P] Sete skills em `.claude/skills/agenza-*/SKILL.md`
- [x] T003 [P] `.mcp.json` na raiz com GitHub, Playwright, shadcn e chrome-devtools
- [x] T004 [P] `apps/admin-frontend/README.md` — preparação de ambiente para outros devs
- [x] T005 [P] Atualizar `README.md` da raiz com ponteiros para o novo material
- [x] T006 ADR 0041 — reintrodução dos arquivos de instrução de IA, revisitando a ADR 0016

---

## Fase 1 — Tokens, tema e tipografia

**Objetivo**: nenhum componente pode ser construído antes dos tokens existirem nos dois temas.
**Bloqueia**: todas as fases seguintes.

### Tokens

- [ ] T010 [FND] Reescrever `src/app/globals.css`: `@import 'tailwindcss'` e
      `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))`
- [ ] T011 [FND] Camada semântica completa em `:root` — incluir os que faltam hoje: `--card`,
      `--card-foreground`, `--popover`, `--popover-foreground`, `--destructive-foreground`,
      `--sidebar-*`, `--chart-1..5`, `--font-sans`. Sem eles, componentes shadcn renderizam sem fundo
- [ ] T012 [FND] Marca violeta: `--brand-h: 288 --brand-c: 0.155 --brand-l: 0.525` no claro;
      `0.72 / 0.145` no escuro. Neutros derivados do mesmo hue em croma 0.006–0.018
- [ ] T013 [FND] Bloco `[data-theme='dark']` sobrescrevendo **apenas** os tokens que mudam
- [ ] T014 [FND] `@theme inline` mapeando `--color-*` para as variáveis semânticas
- [ ] T015 [FND] Anel de foco de dois tons (WCAG 2.2 SC 2.4.13): traço na marca mais deslocamento na
      cor do fundo. Nenhum `outline: none` sem substituto
- [ ] T016 [FND] Elevação: no escuro, degraus de luminosidade de superfície mais realce interno de
      1 px, em vez de `box-shadow`
- [ ] T017 [FND] Classe de etiqueta derivando fundo, texto e borda do hex do backend via `color-mix`
      contra a superfície do tema — o hex nunca é usado cru (FR-016)
- [ ] T018 [FND] Densidade dupla: `@media (pointer: coarse)` eleva alvos de toque a ≥44 px
- [ ] T019 [FND] `@media (prefers-reduced-motion: reduce)` desligando transições

### Tipografia

- [ ] T020 [P] [FND] Instalar `@fontsource-variable/inter` e importar no ponto de entrada
- [ ] T021 [P] [FND] Definir `--font-sans` e a escala tipográfica em `globals.css`

### Tema de três estados

- [ ] T030 [US1] `src/shared/theme/theme.ts` — tipos `ThemeChoice`/`ResolvedTheme`, a função pura
      `resolveTheme(choice, prefersDark)` e `THEME_STORAGE_KEY = 'admin-theme'` (mesma chave do
      identity-service)
- [ ] T031 [US1] `src/shared/theme/themeStore.ts` — snapshot/subscribe/setChoice espelhando
      `shared/session/sessionStore.ts`; assina `matchMedia('(prefers-color-scheme: dark)')` para
      reagir ao SO; aplica `data-theme`, `style.colorScheme` e `<meta name="theme-color">`
- [ ] T032 [US1] `src/shared/theme/useTheme.ts` — `useSyncExternalStore` sobre o store
- [ ] T033 [US1] Testes de `theme.ts` e `themeStore.ts` — resolução dos três estados, reação à
      mudança do SO, persistência, ausência de preferência
- [ ] T034 [US1] `index.html`: script inline bloqueante no `<head>`, porte direto de
      `identity-service/wwwroot/js/theme-init.js` (mesma precedência: armazenado → atributo → SO)
- [ ] T035 [US1] `index.html`: `lang="pt-BR"` (hoje está `en`), `<meta name="theme-color">`, e
      `viewport` com `viewport-fit=cover, interactive-widget=resizes-content`

### Handoff com o identity-service (fecha a ADR 0020)

- [ ] T040 [US1] `src/features/auth/model/sessionDriver.ts`: passar
      `extraQueryParams: { theme: resolvedTheme }` no `signinRedirect()` — em tempo de chamada, não
      na construção do `UserManager`, para ler o tema corrente
- [ ] T041 [US1] Teste afirmando que o tema resolvido corrente chega ao `signinRedirect`
- [ ] T042 [US1] `backend/services/identity-service/IdentityService.Api/wwwroot/css/login.css`:
      aplicar o violeta em `--primary` e `--focus` e no gradiente do painel de marca
- [ ] T043 [US1] Verificar que `AuthorizationController` aceita e aplica o parâmetro `theme`
      conforme a ADR 0020; se não aceitar, implementar

**Checkpoint 1**: `npm run build && npm run test:coverage` verdes. Alternar os três temas manualmente,
mudar o tema do SO em modo automático, recarregar sem lampejo, e conferir o login no mesmo tema.

---

## Fase 2 — Camada de primitivos

**Depende de**: Fase 1. **Bloqueia**: Fases 3, 4, 5.

- [ ] T050 [FND] **Antes de qualquer primitivo**: adicionar `src/shared/ui/**` a `coverage.exclude`
      em `vitest.config.ts` (decisão D5 do plan.md). Fora de ordem, o CI fica vermelho e parece
      regressão
- [ ] T051 [FND] Instalar `@base-ui/react@^1.8.0` e `lucide-react`
- [ ] T052 [FND] Reescrever `src/shared/ui/button.tsx` com a prop `render` do Base UI, aposentando
      `Slot.Root`. Preservar os `data-slot`/`data-variant`/`data-size` e o conjunto estendido de tamanhos
- [ ] T053 [FND] Remover `radix-ui` do `package.json`
- [ ] T054 [FND] Criar `src/shared/hooks/` — declarado em `components.json`, nunca criado
- [ ] T055 [P] [FND] Primitivos de superfície: `card`, `badge`, `separator`, `skeleton`, `avatar`
- [ ] T056 [P] [FND] Primitivos de sobreposição: `dialog`, `sheet`, `dropdown-menu`, `tooltip`, `toast`
- [ ] T057 [P] [FND] Primitivos de entrada: `input`, `label`, `visually-hidden`
- [ ] T058 [FND] `src/shared/ui/kbd.tsx` — o keycap, com as variantes de nível A e B da decisão D4
- [ ] T059 [FND] Reescrever `src/shared/ui/FullScreenMessage.tsx` sobre os novos tokens
- [ ] T060 [FND] Passe de `exactOptionalPropertyTypes` em todos os primitivos adicionados
- [ ] T061 [FND] Regerar `package-lock.json` em container Linux
      (`npm install --package-lock-only --ignore-scripts`) — senão `npm ci` quebra no CI por causa dos
      bindings nativos do `@tailwindcss/oxide`

**Checkpoint 2**: `npm run lint && npm run build && npm run test:coverage` verdes, e `npm ci` funciona
a partir do lockfile regerado.

---

## Fase 3 — Shell responsivo

**Depende de**: Fase 2. **Bloqueia**: Fases 4, 5.

- [ ] T070 [US2] `src/app/shell/navigation.ts` — os seis destinos como dado: rótulo pt-BR, ícone,
      rota, sinalizador `comingSoon`
- [ ] T071 [US2] `src/app/shell/AppShell.tsx` — grade responsiva; ≥1024 px barra lateral,
      768–1023 px trilho de ícones, <768 px barra inferior
- [ ] T072 [US2] `src/app/shell/SidebarNav.tsx` — `aria-current="page"` no item ativo,
      `<nav aria-label>` distinto
- [ ] T073 [US2] `src/app/shell/BottomNav.tsx` — cinco alvos, `env(safe-area-inset-bottom)` no padding
- [ ] T074 [US2] `src/app/shell/AppHeader.tsx` — busca, ações, menu de conta
- [ ] T075 [US1] `src/app/shell/ThemeToggle.tsx` — os três estados, não um alternador binário
- [ ] T076 [US3] `src/app/shell/SkipLink.tsx` — primeiro elemento focável do documento
- [ ] T077 [US3] `src/app/shell/RouteAnnouncer.tsx` — região `aria-live="polite"` anunciando o título
      da rota; SPA não dispara isso sozinho
- [ ] T078 [US3] Foco movido para `<main tabIndex={-1}>` na troca de rota, com scroll ao topo
- [ ] T079 [US2] Mobile: `100dvh`, `overscroll-behavior: contain` nas listas, `font-size` mínimo de
      16 px em campos para evitar o zoom automático do iOS
- [ ] T080 [FND] **Deletar** `src/app/AppLayout.tsx` e `src/app/AppLayout.test.tsx`
- [ ] T081 [FND] **Deletar** `src/app/HomePage.tsx` e `src/app/HomePage.test.tsx`
- [ ] T082 [US2] Testes: item ativo da navegação, alternância de layout por largura, anunciador de rota
- [ ] T083 [FND] Atualizar `vitest.config.ts` — trocar as exclusões de `AppLayout`/`HomePage` pelas
      novas equivalentes

**Checkpoint 3**: navegar por todos os destinos apenas com teclado; verificar a 375 px, 800 px e
1440 px; CI verde.

---

## Fase 4 — Rotas e telas "Em breve"

**Depende de**: Fase 3. **Bloqueia**: Fase 5.

- [ ] T090 [US5] `src/app/pages/ComingSoon.tsx` — componente compartilhado, recebendo o texto
      específico de cada destino
- [ ] T091 [P] [US5] `Agenda.tsx`, `Clientes.tsx`, `Conversas.tsx`, `Ajustes.tsx` — cada uma com
      explicação própria do escopo, sem texto genérico repetido (FR-006)
- [ ] T092 [P] [US5] `Inicio.tsx` e `Servicos.tsx` — esqueleto mínimo; o conteúdo real é feature futura
- [ ] T093 [US5] `src/app/routes.tsx` — seis rotas sob `<ProtectedRoute><AppShell/></ProtectedRoute>`,
      preservando `/login`, `/callback` e o `AppRouteError`
- [ ] T094 [US5] Teste: cada destino sem backend renderiza sua explicação específica

**Checkpoint 4**: seis rotas alcançáveis, cada uma com título e anúncio corretos; CI verde.

---

## Fase 5 — Atalhos, paleta e evidência

**Depende de**: Fases 3 e 4.

- [ ] T100 [US4] `src/shared/keyboard/platform.ts` — glifo `⌘` ou `Ctrl`; na dúvida, `Ctrl`
- [ ] T101 [US4] `src/shared/keyboard/shortcuts.ts` — registro pequeno; comparação por `event.key`,
      **nunca** `event.code` (ABNT2); supressão automática em `input`, `textarea`, `contenteditable`,
      `[role="textbox"]` e com diálogo aberto
- [ ] T102 [US4] `src/shared/keyboard/useShortcut.ts` — assinatura e limpeza
- [ ] T103 [US4] Marcação de teclado: `data-kbd` no `<html>` ao primeiro keydown real, para resgatar
      tablet com teclado acoplado (reportado como `pointer: coarse`). **Nunca** `navigator.maxTouchPoints`
- [ ] T104 [US4] Preferência "Atalhos de teclado" (WCAG 2.1.4): desligada remove handlers de tecla
      única **e** todas as dicas; `Ctrl/⌘+K` e `Esc` permanecem
- [ ] T105 [US4] `src/app/shell/CommandPalette.tsx` sobre o Base UI Combobox — navegar aos seis
      destinos, trocar tema, abrir ajuda, sair; trilho direito com a tecla de cada item
- [ ] T106 [US4] `src/app/shell/ShortcutHelpSheet.tsx` — a folha `?`, agrupada, com o modificador
      correto da plataforma
- [ ] T107 [US4] Nível A: keycap em repouso no controle de busca, na ação primária única da tela e no
      confirmar de diálogo. `<kbd aria-hidden="true">` + `aria-keyshortcuts` no botão — sem isso o nome
      acessível vira "Novo serviço N"
- [ ] T108 [US4] Nível B: tooltip em hover **e** foco a 250 ms nos botões de ícone com atalho
- [ ] T109 [US4] Portão de renderização das dicas:
      `shortcutsEnabled AND ((hover:hover) and (pointer:fine) OR html[data-kbd])`
- [ ] T110 [US4] O keycap é **derivado do registro de atalhos**, não digitado à mão; sem prop
      `shortcut` no `Button` genérico (decisão D4)
- [ ] T111 [US4] Testes: `event.key` em teclas de caractere único, supressão durante digitação,
      preferência desligada, e nome acessível do CTO primário igual ao rótulo visível

**Checkpoint 5**: sem instrução prévia, é possível identificar na tela de Serviços que criar serviço
tem atalho; desligar a preferência silencia `/`, `?` e `n`; CI verde.

---

## Fase 6 — Portões de acessibilidade e documentação

- [ ] T120 [US3] Instalar `axe-core` e `@axe-core/playwright`
- [ ] T121 [US3] `src/test/a11y.ts` — helper `expectNoA11yViolations(container)` sobre `axe-core`
      direto (~15 linhas), evitando um wrapper de terceiros
- [ ] T122 [US3] Aplicar o helper ao shell, ao diálogo, à paleta e às telas "Em breve"
- [ ] T123 [US3] `e2e/a11y.spec.ts` — auditoria contra o stack Aspire real, nos dois temas
- [ ] T124 [US3] **Verificação manual** (a automação cobre ~30–40%): teclado do login ao logout;
      leitor de tela em pt-BR; 375 px real; contraste dos tokens nos dois temas em hardware Windows
      1366×768
- [ ] T130 ADR 0039 — Base UI como camada de primitivos; encerra "UI component library" dos Deferred
      Decisions da constitution
- [ ] T131 ADR 0040 — tema de três estados e o contrato de handoff com o identity-service
- [ ] T132 Atualizar `docs/ARCHITECTURE.md`: §1 (novas pastas `shared/theme`, `shared/keyboard`,
      `app/shell`, `app/pages`), §5 (Base UI, tema próprio, exclusão de cobertura, a regra D4, e o que
      não foi adotado e por quê), §6 (remover `HomePage` da lista de provisórios)
- [ ] T133 Atualizar `.specify/memory/constitution.md` — marcar "UI component library" como resolvido
      apontando para a ADR 0039

**Checkpoint 6**: todos os portões de CI verdes; auditoria a11y sem violações nos dois temas;
documentação sincronizada com o código.

---

## Dependências entre fases

```
Fase 0 (ambiente)  ─── independente, habilita as demais
Fase 1 (tokens/tema) ──> Fase 2 (primitivos) ──> Fase 3 (shell) ──> Fase 4 (rotas) ──> Fase 5 (atalhos)
                                                                                  └──> Fase 6 (gates/docs)
```

T050 é **pré-requisito rígido** de T055–T059: a exclusão de cobertura vem antes dos primitivos.

## Verificação de aceite

1. `npm run dev --workspace=apps/admin-frontend` (ou via Aspire, que injeta as seis `VITE_*`)
2. **Tema** — alternar claro → escuro → automático; mudar o tema do SO com automático ativo; recarregar
   e confirmar zero lampejo; ir a `/login` e conferir o mesmo tema
3. **Teclado** — login → painel → diálogo → logout apenas com teclado; `Ctrl+K`, `/`, `?`, `n`, `Esc`;
   desligar a preferência e confirmar que `/`, `?` e `n` silenciam
4. **Mobile** — 375×812: barra inferior, folha "Mais", safe area, sem rolagem horizontal, campos sem
   zoom ao focar
5. `npm run lint && npm run format:check && npm run build && npm run test:coverage`
6. `npm run test:e2e`
7. Auditoria manual de contraste nos dois temas e leitor de tela em pt-BR
