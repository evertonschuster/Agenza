# Tasks: Ações sem atalhos personalizados

**Input**: [spec.md](spec.md) · [plan.md](plan.md)

## Fase 1 — Paleta por clique

- [x] T001 [US1] Controlar a paleta em `src/app/shell/AppShell.tsx`.
- [x] T002 [US1] Ligar `AppHeader` diretamente à abertura da paleta e cobrir Buscar → seleção de comando.

## Fase 2 — Ações e componentes

- [x] T003 [US2] Retirar os registros de Serviços, lista e formulário de Etiquetas e confirmação de exclusão.
- [x] T004 [US2] Preservar clique, validação, estados pendentes e fechamento dos diálogos.
- [x] T005 [US3] Simplificar `ActionButton` e remover `LinkButton` de uso único, retirando props e subcomponentes exclusivos de atalhos.
- [x] T006 [US3] Retirar a folha de ajuda, `shared/keyboard/`, keycaps sem consumidores e exportações mortas.
- [x] T007 [US1–US3] Trocar testes exclusivos de atalhos por cobertura dos fluxos por clique.

## Fase 3 — Documentação e verificação

- [x] T008 Atualizar arquitetura, specs históricas, índice de ADRs e skills locais sem apagar decisões anteriores.
- [x] T009 Rodar TypeScript, lint, Prettier, Vitest com cobertura e o E2E aplicável.
- [x] T010 Confirmar ausência de listeners, dicas e ids de atalhos personalizados no código de produção.
- [x] T011 Remover partes sem consumidor do combobox da paleta e incluí-lo na cobertura.
