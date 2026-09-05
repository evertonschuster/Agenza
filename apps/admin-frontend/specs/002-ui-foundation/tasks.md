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

- [x] T010 [FND] Reescrever `src/app/globals.css`: `@import 'tailwindcss'` e
      `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *))`
- [x] T011 [FND] Camada semântica completa em `:root` — incluir os que faltam hoje: `--card`,
      `--card-foreground`, `--popover`, `--popover-foreground`, `--destructive-foreground`,
      `--sidebar-*`, `--chart-1..5`, `--font-sans`. Sem eles, componentes shadcn renderizam sem fundo
- [x] T012 [FND] Marca violeta: `--brand-h: 288 --brand-c: 0.155 --brand-l: 0.525` no claro;
      `0.72 / 0.145` no escuro. Neutros derivados do mesmo hue em croma 0.006–0.018
- [x] T013 [FND] Bloco `[data-theme='dark']` sobrescrevendo **apenas** os tokens que mudam
- [x] T014 [FND] `@theme inline` mapeando `--color-*` para as variáveis semânticas
- [x] T015 [FND] Anel de foco de dois tons (WCAG 2.2 SC 2.4.13): traço na marca mais deslocamento na
      cor do fundo. Nenhum `outline: none` sem substituto. _Revisão (7b/T143) achou os primitivos
      (`button`, `input`, `textarea`, `input-group`) matando o anel de `@layer base` com
      `outline-none` e sobrando só um `ring-*/50` translúcido, sem deslocamento. Corrigido: cada um
      ganhou `ring-offset-2 ring-offset-background` + `ring-2 ring-ring` opacos — o próprio
      substituto de dois tons que a regra exige, agora no nível do componente. Contraste
      `--ring` × `--background` calculado (não estimado): 5.54:1 claro, 7.41:1 escuro, acima do 3:1
      da SC 2.4.13. Verificado num browser real contra o Aspire real: o `box-shadow` computado do
      input focado mostra exatamente `oklch(--background) 2px` seguido de `oklch(--ring) 2px`._
- [x] T016 [FND] Elevação: no escuro, degraus de luminosidade de superfície mais realce interno de
      1 px, em vez de `box-shadow`
- [ ] T017 [FND] ~~Classe de etiqueta derivando fundo, texto e borda do hex do backend via
      `color-mix` contra a superfície do tema — o hex nunca é usado cru (FR-016)~~. **Desmarcado**
      (7b/T148): a técnica está correta, mas não existe nenhum lugar nesta fase com dado real de
      tag vindo do backend para exercitá-la (todas as telas de negócio são "Em breve"), e fabricar
      um consumidor só para marcar a tarefa violaria FR-006/o princípio de não construir UI falsa.
      A classe `.tag` continua em `globals.css`, pronta, seguindo o mesmo precedente já registrado
      para `shared/api/` na ADR 0038 (infraestrutura correta sem chamador ainda não é código morto)
- [ ] T018 [FND] ~~Densidade dupla: `@media (pointer: coarse)` eleva alvos de toque a ≥44 px~~.
      **Desmarcado** (7b/T144): `--control-h-sm/md/lg` foi declarado e nunca lido por nenhum
      primitivo — CSS morto confirmado (zero ocorrências fora de `globals.css` e deste arquivo).
      Ligá-lo de verdade exigiria decidir, sem nenhuma decisão de design registrada em spec.md/plan.md,
      quais controles participam (`Button` teria variantes claramente mapeáveis por valor, mas
      `Avatar`, os ícones compactos de `InputGroup` e os chips do Combobox não têm um limite óbvio) —
      exatamente o tipo de julgamento que este ciclo de correções não deveria inventar sozinho. Os
      tokens e o bloco `@media (pointer: coarse)` foram removidos de `globals.css`. `BottomNav`'s
      `min-h-11`, escrito à mão, continua sendo o único ponto real de conformidade com alvo de toque
      ≥44 px do app hoje
- [x] T019 [FND] `@media (prefers-reduced-motion: reduce)` desligando transições

### Tipografia

- [x] T020 [P] [FND] Instalar `@fontsource-variable/inter` e importar no ponto de entrada
- [x] T021 [P] [FND] Definir `--font-sans` e a escala tipográfica em `globals.css`

### Tema de três estados

- [x] T030 [US1] `src/shared/theme/theme.ts` — tipos `ThemeChoice`/`ResolvedTheme`, a função pura
      `resolveTheme(choice, prefersDark)` e `THEME_STORAGE_KEY = 'admin-theme'` (mesma chave do
      identity-service)
- [x] T031 [US1] `src/shared/theme/themeStore.ts` — snapshot/subscribe/setChoice espelhando
      `shared/session/sessionStore.ts`; assina `matchMedia('(prefers-color-scheme: dark)')` para
      reagir ao SO; aplica `data-theme`, `style.colorScheme` e `<meta name="theme-color">`
- [x] T032 [US1] `src/shared/theme/useTheme.ts` — `useSyncExternalStore` sobre o store
- [x] T033 [US1] Testes de `theme.ts` e `themeStore.ts` — resolução dos três estados, reação à
      mudança do SO, persistência, ausência de preferência
- [x] T034 [US1] `index.html`: script inline bloqueante no `<head>`, porte direto de
      `identity-service/wwwroot/js/theme-init.js` (mesma precedência: armazenado → atributo → SO)
- [x] T035 [US1] `index.html`: `lang="pt-BR"` (hoje está `en`), `<meta name="theme-color">`, e
      `viewport` com `viewport-fit=cover, interactive-widget=resizes-content`

### Handoff com o identity-service (fecha a ADR 0020)

- [x] T040 [US1] `src/features/auth/model/sessionDriver.ts`: passar
      `extraQueryParams: { theme: resolvedTheme }` no `signinRedirect()` — em tempo de chamada, não
      na construção do `UserManager`, para ler o tema corrente
- [x] T041 [US1] Teste afirmando que o tema resolvido corrente chega ao `signinRedirect`
- [x] T042 [US1] `backend/services/identity-service/IdentityService.Api/wwwroot/css/login.css`:
      aplicar o violeta em `--primary` e `--focus` e no gradiente do painel de marca
- [x] T043 [US1] Verificar que `AuthorizationController` aceita e aplica o parâmetro `theme`
      conforme a ADR 0020; se não aceitar, implementar

**Checkpoint 1**: `npm run build && npm run test:coverage` verdes. Alternar os três temas manualmente,
mudar o tema do SO em modo automático, recarregar sem lampejo, e conferir o login no mesmo tema.

---

## Fase 2 — Camada de primitivos

**Depende de**: Fase 1. **Bloqueia**: Fases 3, 4, 5.

- [x] T050 [FND] **Antes de qualquer primitivo**: adicionar `src/shared/ui/**` a `coverage.exclude`
      em `vitest.config.ts` (decisão D5 do plan.md). Fora de ordem, o CI fica vermelho e parece
      regressão
- [x] T051 [FND] Instalar `@base-ui/react@^1.8.0` e `lucide-react`
- [x] T052 [FND] Reescrever `src/shared/ui/button.tsx` com a prop `render` do Base UI, aposentando
      `Slot.Root`. Preservar os `data-slot`/`data-variant`/`data-size` e o conjunto estendido de tamanhos
- [x] T053 [FND] Remover `radix-ui` do `package.json`
- [x] T054 [FND] Criar `src/shared/hooks/` — declarado em `components.json`, nunca criado
- [x] T055 [P] [FND] Primitivos de superfície: `card`, `badge`, `separator`, `skeleton`, `avatar`
- [x] T056 [P] [FND] Primitivos de sobreposição: `dialog`, `sheet`, `dropdown-menu`, `tooltip`, `toast`
- [x] T057 [P] [FND] Primitivos de entrada: `input`, `label`, `visually-hidden`
- [x] T058 [FND] `src/shared/ui/kbd.tsx` — o keycap, com as variantes de nível A e B da decisão D4
- [x] T059 [FND] Reescrever `src/shared/ui/FullScreenMessage.tsx` sobre os novos tokens
- [x] T060 [FND] Passe de `exactOptionalPropertyTypes` em todos os primitivos adicionados
- [x] T061 [FND] Regerar `package-lock.json` em container Linux
      (`npm install --package-lock-only --ignore-scripts`) — senão `npm ci` quebra no CI por causa dos
      bindings nativos do `@tailwindcss/oxide`

**Checkpoint 2**: `npm run lint && npm run build && npm run test:coverage` verdes, e `npm ci` funciona
a partir do lockfile regerado.

---

## Fase 3 — Shell responsivo

**Depende de**: Fase 2. **Bloqueia**: Fases 4, 5.

- [x] T070 [US2] `src/app/shell/navigation.ts` — os seis destinos como dado: rótulo pt-BR, ícone,
      rota, sinalizador `comingSoon`
- [x] T071 [US2] `src/app/shell/AppShell.tsx` — grade responsiva; ≥1024 px barra lateral,
      768–1023 px trilho de ícones, <768 px barra inferior
- [x] T072 [US2] `src/app/shell/SidebarNav.tsx` — `aria-current="page"` no item ativo,
      `<nav aria-label>` distinto
- [x] T073 [US2] `src/app/shell/BottomNav.tsx` — cinco alvos, `env(safe-area-inset-bottom)` no padding
- [x] T074 [US2] `src/app/shell/AppHeader.tsx` — busca, ações, menu de conta
- [x] T075 [US1] `src/app/shell/ThemeToggle.tsx` — os três estados, não um alternador binário
- [x] T076 [US3] `src/app/shell/SkipLink.tsx` — primeiro elemento focável do documento
- [x] T077 [US3] `src/app/shell/RouteAnnouncer.tsx` — região `aria-live="polite"` anunciando o título
      da rota; SPA não dispara isso sozinho
- [x] T078 [US3] Foco movido para `<main tabIndex={-1}>` na troca de rota, com scroll ao topo
- [x] T079 [US2] Mobile: `100dvh`, `overscroll-behavior: contain` nas listas, `font-size` mínimo de
      16 px em campos para evitar o zoom automático do iOS
- [x] T080 [FND] **Deletar** `src/app/AppLayout.tsx` e `src/app/AppLayout.test.tsx`
- [x] T081 [FND] **Deletar** `src/app/HomePage.tsx` e `src/app/HomePage.test.tsx`
- [x] T082 [US2] Testes: item ativo da navegação, alternância de layout por largura, anunciador de rota
- [x] T083 [FND] Atualizar `vitest.config.ts` — trocar as exclusões de `AppLayout`/`HomePage` pelas
      novas equivalentes (nenhuma existia; cobertura de `app/shell` ficou em 98.75%/85.45%/100%/100%
      sem precisar excluir nada novo)

**Checkpoint 3**: navegar por todos os destinos apenas com teclado; verificar a 375 px, 800 px e
1440 px; CI verde.

---

## Fase 4 — Rotas e telas "Em breve"

**Depende de**: Fase 3. **Bloqueia**: Fase 5.

- [x] T090 [US5] `src/app/pages/ComingSoon.tsx` — componente compartilhado, recebendo o texto
      específico de cada destino
- [x] T091 [P] [US5] `Agenda.tsx`, `Clientes.tsx`, `Conversas.tsx`, `Ajustes.tsx` — cada uma com
      explicação própria do escopo, sem texto genérico repetido (FR-006)
- [x] T092 [P] [US5] `Inicio.tsx` e `Servicos.tsx` — esqueleto mínimo; o conteúdo real é feature futura
- [x] T093 [US5] `src/app/routes.tsx` — seis rotas sob `<ProtectedRoute><AppShell/></ProtectedRoute>`,
      preservando `/login`, `/callback` e o `AppRouteError`
- [x] T094 [US5] Teste: cada destino sem backend renderiza sua explicação específica

**Checkpoint 4**: seis rotas alcançáveis, cada uma com título e anúncio corretos; CI verde.

---

## Fase 5 — Atalhos, paleta e evidência

**Depende de**: Fases 3 e 4.

- [x] T100 [US4] `src/shared/keyboard/platform.ts` — glifo `⌘` ou `Ctrl`; na dúvida, `Ctrl`
- [x] T101 [US4] `src/shared/keyboard/shortcuts.ts` — registro pequeno; comparação por `event.key`,
      **nunca** `event.code` (ABNT2); supressão automática em `input`, `textarea`, `contenteditable`,
      `[role="textbox"]` e com diálogo aberto
- [x] T102 [US4] `src/shared/keyboard/useShortcut.ts` — assinatura e limpeza
- [x] T103 [US4] Marcação de teclado: `data-kbd` no `<html>` ao primeiro keydown real, para resgatar
      tablet com teclado acoplado (reportado como `pointer: coarse`). **Nunca** `navigator.maxTouchPoints`.
      _Revisão (7b/T147) achou `markKeyboardDevice()` chamado incondicionalmente em todo keydown —
      um toque em campo de texto num Android/iPhone (via teclado virtual) também marcava `data-kbd`,
      liberando dicas num aparelho só de toque, contra a regra D4. Corrigido com
      `looksLikeRealKeyboard(event)`: conta como teclado real se houver modificador, se a tecla for
      Tab/Escape, ou se o alvo não for um campo de digitação — um toque puro só produz keydown via
      teclado virtual, e isso exige um campo focado, então um caractere simples ali nunca conta
      sozinho. Testes novos em `shortcuts.test.ts` cobrem as quatro combinações._
- [x] T104 [US4] Preferência "Atalhos de teclado" (WCAG 2.1.4): desligada remove handlers de tecla
      única **e** todas as dicas; `Ctrl/⌘+K` e `Esc` permanecem
- [x] T105 [US4] `src/app/shell/CommandPalette.tsx` sobre o Base UI Combobox — navegar aos seis
      destinos, trocar tema, abrir ajuda, sair; trilho direito com a tecla de cada item. _Revisão
      (7b/T145) achou o trilho ausente — `CommandPalette.tsx` nem importava `Kbd`. Corrigido: `Command`
      ganhou `shortcutId?`, e um `CommandKeycap` interno lê o atalho do registro
      (`useRegisteredShortcut` + `formatShortcutKey`, nunca digitado à mão — D4/T110) e mostra o
      trilho sem depender do gate de visibilidade (Nível C do D4: a paleta sempre mostra). Só "Abrir
      ajuda" tem atalho de verdade hoje (`?`); navegação/tema/sair não têm um registrado. Verificado
      no Aspire real: o item mostra "?" corretamente._
- [x] T106 [US4] `src/app/shell/ShortcutHelpSheet.tsx` — a folha `?`, agrupada, com o modificador
      correto da plataforma
- [x] T107 [US4] Nível A: keycap em repouso no controle de busca, na ação primária única da tela e no
      confirmar de diálogo. `<kbd aria-hidden="true">` + `aria-keyshortcuts` no botão — sem isso o nome
      acessível vira "Novo serviço N". _Busca e CTA de Serviços feitos; nenhum diálogo com confirmar
      existe ainda nesta fase — o padrão fica pronto para quando um aparecer._
- [x] T108 [US4] Nível B: tooltip em hover **e** foco a 250 ms nos botões de ícone com atalho.
      _Nenhum botão de ícone com atalho próprio existe ainda (itens de navegação são excluídos por
      decisão D4) — o `Tooltip` + `Kbd` que o padrão usaria já existe e roda no modo compacto do
      `SidebarNav`; revisitar quando surgir uma instância concreta._ **Revisão (7b/T146)**: achou o
      bug real por trás dessa espera — `TooltipProvider`'s `delay` valia `0`, não os 250 ms da
      decisão D4, então mesmo quando um consumidor aparecer o tooltip abriria instantâneo.
      Corrigido o default para `250`. Verificado no Aspire real: hover no `SidebarNav` compacto abre
      o tooltip (mecanismo confirmado ponta a ponta); o limite exato de 250 ms não deu para cronometrar
      com precisão neste ambiente de automação — a aba fica "hidden" para o host e por isso os timers
      rodam sob throttling, então a fonte (`delay = 250`, sem nenhum override) é a evidência que sustenta
      o número, não um cronômetro no browser
- [x] T109 [US4] Portão de renderização das dicas:
      `shortcutsEnabled AND ((hover:hover) and (pointer:fine) OR html[data-kbd])`
- [x] T110 [US4] O keycap é **derivado do registro de atalhos**, não digitado à mão; sem prop
      `shortcut` no `Button` genérico (decisão D4)
- [x] T111 [US4] Testes: `event.key` em teclas de caractere único, supressão durante digitação,
      preferência desligada, e nome acessível do CTO primário igual ao rótulo visível

**Checkpoint 5**: sem instrução prévia, é possível identificar na tela de Serviços que criar serviço
tem atalho; desligar a preferência silencia `/`, `?` e `n`; CI verde.

---

## Fase 6 — Portões de acessibilidade e documentação

- [x] T120 [US3] Instalar `axe-core` e `@axe-core/playwright`
- [x] T121 [US3] `src/test/a11y.ts` — helper `expectNoA11yViolations(container)` sobre `axe-core`
      direto (~15 linhas), evitando um wrapper de terceiros
- [x] T122 [US3] Aplicar o helper ao shell, ao diálogo, à paleta e às telas "Em breve"
- [ ] T123 [US3] `e2e/a11y.spec.ts` — auditoria contra o stack Aspire real, nos dois temas.
      _Escrito (`e2e/a11y.spec.ts`, dois temas × shell/Serviços, reaproveitando o login de
      `e2e/helpers.ts`) e tipado, mas **não executado**: este ambiente não tem os browsers do
      Playwright instalados (`npx playwright install`) nem o stack Aspire de pé (`ECONNREFUSED` em
      5080/5081). Falta rodar `npm run test:e2e -- e2e/a11y.spec.ts` com o Aspire real no ar antes
      de marcar como feito._
- [ ] T124 [US3] **Verificação manual** (a automação cobre ~30–40%): teclado do login ao logout;
      leitor de tela em pt-BR; 375 px real; contraste dos tokens nos dois temas em hardware Windows
      1366×768. _Não automatizável por definição — depende de quem tem o hardware e o leitor de
      tela; nenhuma das quatro verificações foi feita ainda._
- [x] T130 ADR 0039 — Base UI como camada de primitivos; encerra "UI component library" dos Deferred
      Decisions da constitution. _Já existia; conferida a precisão contra o código enviado._
- [x] T131 ADR 0040 — tema de três estados e o contrato de handoff com o identity-service. _Já
      existia; conferida a precisão contra o código enviado._
- [x] T132 Atualizar `docs/ARCHITECTURE.md`: §1 (novas pastas `shared/theme`, `shared/keyboard`,
      `app/shell`, `app/pages`), §5 (Base UI, tema próprio, exclusão de cobertura, a regra D4, e o que
      não foi adotado e por quê), §6 (remover `HomePage` da lista de provisórios)
- [x] T133 Atualizar `.specify/memory/constitution.md` — marcar "UI component library" como resolvido
      apontando para a ADR 0039

**Checkpoint 6**: todos os portões de CI verdes; auditoria a11y sem violações nos dois temas;
documentação sincronizada com o código.

---

---

## Fase 7 — Correções da revisão (2026-09-04)

Achados **verificados individualmente** na revisão da implementação. Cada um foi confirmado lendo o
código; nenhum vem de suposição. Os gates atuais passam apesar deles — nada aqui é detectável pelos
portões existentes, que é exatamente por que passou.

### 7a — Bloqueador e segurança (fazer primeiro, entregar sozinho)

- [x] T140 [US2] **Header estoura horizontalmente abaixo de 640 px.** `Button` traz `shrink-0` na
      base do cva (`src/shared/ui/button.tsx:6`) e `src/app/shell/AppHeader.tsx:31` aplica `w-full`
      nele. Item flex que não encolhe com largura 100% empurra os irmãos para fora e o menu de conta
      sai da tela. Reprova FR-007 e SC-002. Corrigir no consumidor (`min-w-0` + `flex-1`), não
      removendo o `shrink-0` do primitivo, que outros usos dependem dele. _Corrigido em
      `AppHeader.tsx`: `w-full max-w-sm ... sm:w-64` → `min-w-0 flex-1 ... sm:max-w-64` (o `max-w`
      no lugar do `w` porque `flex-1` fixa `flex-basis:0`, que passa a ignorar `width` no eixo
      principal — um `width` ali ficaria morto). Verificado num browser real, sem overflow: 375 px,
      620 px (a faixa exatamente abaixo dos 640 px do achado) e 1280 px, onde a caixa de busca
      volta a ocupar os mesmos ~256 px de antes. Não dá para testar isso em jsdom — não há layout
      real — por isso a verificação foi só no browser, sem teste automatizado novo._
- [x] T141 [US4] **`aria-keyshortcuts` sobrevive ao desligar dos atalhos (WCAG 2.1.4).**
      `useShortcutHint` (`src/shared/keyboard/shortcuts.ts:211`) devolve `key` incondicionalmente e
      `AppHeader.tsx:34` o repassa. Com a preferência desligada o keycap some, mas o leitor de tela
      continua anunciando um atalho que não dispara mais. `key` deve seguir a mesma condição de
      `visible`. _Corrigido: `key` só é devolvido quando `visible` é verdadeiro. Verificado num
      browser real (o atributo desaparece do DOM ao desmarcar a preferência) e com dois testes novos
      em `AppHeader.test.tsx`._
- [x] T142 [US3] **A folha de ajuda é silenciosa para leitor de tela.** `src/shared/ui/kbd.tsx:13`
      aplica `aria-hidden="true"` incondicionalmente — correto dentro de um botão, onde o keycap
      poluiria o nome acessível, e errado em `ShortcutHelpSheet.tsx:31,36`, onde a tecla **é** o
      conteúdo. O componente serve dois papéis e precisa de dois comportamentos (uma prop, ou dois
      componentes). _Corrigido com a primeira opção: `aria-hidden="true"` virou um default
      sobrescrevível (movido para antes do `{...props}` em vez de depois), e os dois usos em
      `ShortcutHelpSheet.tsx` passam `aria-hidden={false}`. Verificado num browser real (as quatro
      teclas da folha ficam com `aria-hidden="false"`, os usos dentro de botão continuam
      `"true"`) e com um teste novo em `ShortcutHelpSheet.test.tsx`._

### 7b — Marcado como feito, não entregue

Cada item abaixo está com `[x]` na fase original. **Entregar, ou desmarcar e registrar por quê** —
o que não pode continuar é a marcação mentir.

- [x] T143 [US3] **T015 — o anel de foco de dois tons não alcança os controles.** Está definido em
      `@layer base` (`globals.css:174`), mas `button.tsx`, `input.tsx`, `textarea.tsx` e
      `input-group.tsx` trazem `outline-none` como *utility*, e no Tailwind v4 utility vence base.
      Os controles ficam só com `ring-ring/50` translúcido. Verificar o contraste do indicador
      resultante contra SC 2.4.13 nos dois temas. **Entregue** — ver T015 acima
- [x] T144 [US2] **T018 — densidade dupla é CSS morto.** `--control-h-sm/md/lg` é declarado
      (`globals.css:96`) e sobrescrito em `(pointer: coarse)` (`:209`), mas **nenhum componente lê
      `var(--control-h-*)`**. Os únicos 44 px reais são `min-h-11` escrito à mão no `BottomNav`. Ou
      os primitivos passam a consumir os tokens, ou remova os tokens e a promessa. **Desmarcado T018**
      — ver a nota lá; a segunda opção da tarefa foi a escolhida
- [x] T145 [US4] **T105 — a paleta não tem trilho de atalho.** `CommandPalette.tsx` sequer importa
      `Kbd`. Nenhum item mostra tecla — e a paleta era, pela pesquisa, a superfície de maior retorno
      para descoberta de atalhos. **Entregue** — ver T105 acima
- [x] T146 [US4] **T108 — tooltip abre com 0 ms**, não os 250 ms da decisão D4
      (`src/shared/ui/tooltip.tsx:6`). Os 250 ms existiam justamente porque hover lento foi a queixa
      original do produto. **Entregue** — ver T108 acima
- [x] T147 [US4] **T103 — `data-kbd` é marcado por qualquer keydown**, inclusive de teclado virtual
      (`shortcuts.ts:109` chama `markKeyboardDevice()` incondicionalmente). Digitar num campo no
      Android libera os keycaps num aparelho só de toque, contra a regra D4 de que no toque a dica é
      **ausente**. **Entregue** — ver T103 acima
- [x] T148 [FND] **T017 — a classe `.tag` não tem nenhum consumidor** (`globals.css:189`). A técnica
      de `color-mix` sobre o hex do backend está correta e não é exercida por nada. **Desmarcado
      T017** — ver a nota lá; a classe fica, sem consumidor, até uma feature de negócio real precisar

### 7c — Violações de regra (baratas)

- [x] T149 [US5] **FR-015 — texto em inglês na interface pt-BR.** `"Close"` em `dialog.tsx:65`,
      `dialog.tsx:98`, `sheet.tsx:66`, e `aria-label="Close toast"` em `toast.tsx:124`. Texto
      `sr-only` é conteúdo de usuário. _As quatro strings viraram "Fechar" / "Fechar notificação".
      `ShortcutHelpSheet` é quem consome `SheetContent` de verdade hoje — o novo teste em
      `ShortcutHelpSheet.test.tsx` confirma o botão de fechar real com nome acessível "Fechar"._
- [x] T150 [FND] **Dois blocos JSDoc em `shortcuts.ts:187` e `:211`**, contra a regra de "sem
      comentário de o-quê, sem JSDoc". Um deles ancora em `T109`, um id de tarefa que perde sentido
      quando a feature fechar. _Os dois blocos removidos; os nomes das funções já bastam._
- [x] T151 [FND] **Diretivas `'use client'` em 5 primitivos** (`avatar`, `combobox`, `dialog`,
      `toast`, `tooltip`) — artefato de Next.js, morto no Vite. _Removida dos cinco arquivos;
      confirmado por busca que nenhuma outra permanece em `src/`._

### 7d — Cobertura de aceite

- [ ] T152 [US3] **`dialog.tsx` não tem nenhum consumidor**, e o SC-001 exige percorrer
      "login → painel → diálogo → logout" só com teclado. Ou uma tela usa o diálogo, ou o SC-001
      precisa ser reescrito
- [ ] T153 [US3] **T123 — `e2e/a11y.spec.ts` cobre 2 das 6 rotas** e nenhuma sobreposição, contra o
      "todas as rotas, nos dois temas" do SC-004. A tarefa está corretamente **desmarcada**; isto é
      o que falta para marcá-la
- [ ] T154 [FND] **Triagem dos achados não verificados.** A revisão levantou ~13 alegações que
      **não** foram confirmadas lendo o código: lógica inline em `Servicos.tsx`; scroll ao topo na
      troca de rota; `overscroll-behavior` inerte; contraste AA de 2 das 8 cores de tag no tema
      claro; `ThemeToggle` sinalizando seleção só por ícone; elevação escura inerte; `bg-black` cru
      nos backdrops; alias `cn` não usado; `research.md` citado no `spec.md` e nunca commitado.
      Confirmar ou descartar cada uma **antes** de agir

### 7e — Consistência do tema (decisão, não defeito)

- [ ] T155 [US1] O par de hex do `theme-color` está em 6 lugares (`themeStore.ts:27`,
      `index.html:10,41`, `theme-init.js:26`, `Login.cshtml:9`, mais o teste) e `#f5f6f8` não bate
      com o `--background` do painel, que é `oklch(0.99 0.006 288)`. **É uma escolha, não um erro**:
      casar com o `--page` do identity-service mantém a barra do navegador constante na travessia do
      redirect; casar com o `--background` faz a cor pular a cada ida ao login. Decidir qual coerência
      vale mais e registrar

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
