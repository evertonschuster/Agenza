# Implementation Plan: Ações sem atalhos personalizados

**Branch**: `codex/remove-keyboard-shortcuts` | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

## Resumo

Manter a paleta e todos os fluxos de negócio acessíveis por clique, removendo os atalhos personalizados, suas dicas e a folha de ajuda. O estado da paleta passa a pertencer ao `AppShell`, com acionamento direto pelo cabeçalho.

## Contexto técnico

- **Escopo**: `apps/admin-frontend`, React e TypeScript estrito; sem alterações de API, backend ou dependências.
- **UI**: Base UI continua responsável por foco, fechamento de diálogos e operação nativa por teclado.
- **Testes**: Vitest/RTL para os fluxos por clique e Playwright existente para Buscar → Etiquetas.
- **Remoção**: `shared/keyboard/`, folha de ajuda, keycaps e variantes `WithShortcut` deixam de ter consumidores.
- **Fronteiras**: `app → features → widgets → shared`; o estado da paleta fica no shell, sem estado novo nas páginas de feature.

## Constituição

- TypeScript estrito, Result, isolamento de tenant e cliente OpenAPI permanecem intactos.
- Os portões de lint, formatação, build, cobertura e E2E continuam obrigatórios.
- Nenhum orquestrador ou dependência é acrescentado.

## Sequência de implementação

1. Controlar a paleta em `AppShell` e abrir pelo clique em `AppHeader`; testar o caminho.
2. Retirar registros das telas e do diálogo. Simplificar `ActionButton` e `LinkButton`, preservando ícones, estados pendentes e acessibilidade.
3. Remover a infraestrutura sem consumidores, a folha e os testes exclusivos dos atalhos. Ajustar testes para comportamento por clique.
4. Atualizar arquitetura, specs históricas e instruções locais; executar todos os portões aplicáveis.

## Decisões

- A paleta continua como superfície de navegação e comandos, mesmo sem combinação para abri-la.
- `Tab`, `Enter`, `Esc` e a digitação normal não são atalhos personalizados e permanecem disponíveis.
- A decisão anterior permanece documentada como história; a retirada é registrada na [ADR 0043](../../../docs/adr/0043-admin-frontend-remove-custom-keyboard-shortcuts.md).
