# Feature Specification: proteção da identidade na renovação

**Branch**: `codex/fix-session-identity-and-client-conflict` | **Created**: 2026-10-26
**Status**: Approved for implementation by the owner in this chat.

## User Scenarios & Testing

### US1 — Renovar sem misturar identidades (P1)
Como usuário autenticado, quero continuar trabalhando após uma renovação da mesma identidade e entrar novamente se o usuário ou negócio mudar.

1. Mesma pessoa e negócio, token renovado: os dados e o formulário continuam abertos.
2. Usuário ou negócio diferente: dados protegidos saem da tela, requisições pendentes são canceladas e a sessão pede novo login.
3. Resposta ou evento antigo depois da invalidação: a sessão não volta a ficar autenticada.
4. Novo login explícito: a pessoa pode estabelecer uma sessão limpa.

### Edge Cases

- Resposta inicial de sessão chega depois de um evento mais recente ou após desmontagem.
- Renovação sem identificação do usuário ou sem negócio mantém o bloqueio até novo login explícito, inclusive se eventos posteriores trouxerem uma identidade válida.
- Remoção das credenciais persistidas falha; a sessão em memória continua bloqueada.
- Cancelamento não desfaz uma operação que o servidor já tenha concluído.

## Requirements

- FR-001: Renovar a mesma identidade preserva o trabalho atual.
- FR-002: Mudança de usuário ou negócio limpa a sessão antes que as credenciais novas possam ser usadas.
- FR-003: A invalidação interrompe requisições e remove a interface protegida.
- FR-004: Credenciais locais são descartadas e a renovação automática é interrompida.
- FR-005: Eventos atrasados não restauram a sessão invalidada; um login explícito é necessário.
- FR-006: Identificação ausente impede a autenticação.
- FR-007: A mensagem é “Sua sessão mudou. Entre novamente para continuar.”.

## Success Criteria

- SC-001: Todos os cenários de usuário/negócio alterado terminam sem credenciais disponíveis e sem dados protegidos visíveis.
- SC-002: Renovação da mesma identidade não apaga o formulário.
- SC-003: Respostas anteriores à invalidação não tornam dados antigos visíveis após novo login.

## Assumptions

- O provedor OIDC existente identifica o usuário; o servidor continua sendo a fronteira de autorização.
- A entrega altera somente o frontend e não adiciona dependências.
