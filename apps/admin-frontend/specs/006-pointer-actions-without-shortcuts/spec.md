# Feature Specification: Ações sem atalhos personalizados

**Feature Branch**: `codex/remove-keyboard-shortcuts`
**Created**: 2026-09-29
**Status**: Em implementação

## Objetivo

Retirar os atalhos de teclado definidos pelo painel sem perder as ações que eles acionavam. Todas as operações continuam disponíveis por controles visíveis e clicáveis. A navegação normal por teclado dos elementos HTML e dos primitivos Base UI permanece disponível.

## Cenários e aceite

### US1 — Acessar a paleta pelo cabeçalho (P1)

1. Ao clicar em **Buscar**, a paleta abre e permite escolher um destino ou comando.
2. A paleta fecha por seus controles normais; o cabeçalho não depende de um registro global para abri-la.
3. `Ctrl/⌘+K` e `/` deixam de ser atalhos do painel.

### US2 — Executar ações de negócio pelos controles (P1)

1. **Novo serviço** mantém o aviso de indisponibilidade ao clique.
2. **Nova etiqueta** abre o formulário; **Salvar** cria ou atualiza com as validações e restrições atuais.
3. O controle de exclusão da linha abre a confirmação; **Excluir** executa a operação com as restrições atuais.
4. `n`, `Ctrl/⌘+S` e `Ctrl/⌘+Delete` deixam de executar essas ações.

### US3 — Interface sem dicas de atalhos (P2)

1. Botões, links e paleta não exibem keycaps nem `aria-keyshortcuts` do produto.
2. A folha **Atalhos de teclado** e o comando para abri-la saem da interface.
3. `?` deixa de abrir a folha.

## Limites

- Não bloquear `Tab`, `Enter`, `Esc` ou a interação nativa de campos, links, botões e diálogos.
- Não mudar contratos de API, regras de negócio, rotas ou estados de carregamento/erro.
- Não acrescentar preferência de atalhos: não haverá atalhos personalizados para configurar.

## Critérios de sucesso

- Os fluxos por clique acima continuam passando em testes de componente e no E2E existente de acesso à paleta.
- Não há listeners ou registro de atalhos personalizados no código de produção do painel.
- Os portões de TypeScript, lint, formatação e testes com cobertura passam.
