# Feature Specification: abrir cadastro existente no conflito de CPF

**Branch**: `codex/fix-session-identity-and-client-conflict` | **Created**: 2026-10-26
**Status**: Approved for implementation by the owner in this chat.

## User Scenarios & Testing

### US1 — Recuperar um cadastro existente (P1)
Como usuário cadastrando ou editando uma pessoa, quero abrir quem já possui o CPF para consultar seus dados, preservando o preenchimento atual.

1. CPF duplicado com cadastro identificado: mostrar o erro no campo e um acesso ao cadastro existente.
2. Abrir esse acesso: edição em nova aba, com aviso de nova aba; o formulário original permanece preenchido.
3. A validação, limpeza ou substituição do erro de CPF atualiza a exibição do acesso pelo próprio formulário.

### Edge Cases

- Resposta de CPF duplicado sem identificador: manter só a mensagem.
- Outro erro ou conflito de e-mail: não mostrar acesso de conflito de CPF.
- Cadastro existente pode estar inativo; a edição continua sendo a consulta da v1.

## Requirements

- FR-001: Criação e edição oferecem o acesso quando a duplicidade de CPF identifica o cadastro existente.
- FR-002: O acesso usa o cadastro retornado pelo servidor e abre a edição em nova aba.
- FR-003: Mensagens, foco no CPF e dados digitados são preservados.
- FR-004: O acesso acompanha somente o erro atual do CPF; não há estado separado para rastrear o conflito.
- FR-005: Metadados ausentes ou de erro diferente não geram link.

## Success Criteria

- SC-001: A pessoa consegue consultar o cadastro existente diretamente pelo erro de CPF.
- SC-002: O nome e demais campos originais continuam preenchidos após abrir a outra aba.
- SC-003: Os cenários de erro não relacionado nunca mostram um link de CPF.

## Assumptions

- O contrato existente fornece o cadastro conflitante do mesmo negócio.
- A edição já atende a consulta da v1; não é criada uma nova tela de detalhes.
- Nenhuma alteração de backend, dependência ou envio de mensagens faz parte desta entrega.
