# Feature Specification: abrir cadastro existente no conflito de CPF ou e-mail

**Status**: implementada em 26/10/2026 no [PR #200](https://github.com/evertonschuster/Agenza/pull/200).

Registro histórico dos requisitos da entrega; não é uma fila de trabalho pendente nem substitui a
[arquitetura vigente](../../docs/ARCHITECTURE.md). Os IDs de requisitos são preservados para rastreabilidade.

## User Scenarios & Testing

### US1 — Recuperar um cadastro existente (P1)

Como usuário cadastrando ou editando uma pessoa, quero abrir quem já possui o CPF ou o e-mail para consultar seus dados, preservando o preenchimento atual.

1. CPF ou e-mail duplicado com cadastro identificado: mostrar o erro no respectivo campo e um acesso ao cadastro existente.
2. Abrir esse acesso: edição em nova aba, com ícone de abertura em nova aba; o formulário original permanece preenchido.
3. A validação, limpeza ou substituição do erro do campo atualiza a exibição do seu acesso pelo próprio formulário.

### Edge Cases

- Resposta de CPF ou e-mail duplicado sem identificador: manter só a mensagem.
- Outro erro: não mostrar acesso ao cadastro existente.
- Cadastro existente pode estar inativo; a edição continua sendo a consulta da v1.

## Requirements

- FR-001: Criação e edição oferecem o acesso quando a duplicidade de CPF ou e-mail identifica o cadastro existente.
- FR-002: O acesso usa o cadastro retornado pelo servidor e abre a edição em nova aba.
- FR-003: Mensagens, foco no campo em conflito e dados digitados são preservados.
- FR-004: Cada acesso acompanha somente o erro atual do seu campo; não há estado separado para rastrear o conflito.
- FR-005: Metadados ausentes ou de erro diferente não geram link.

## Success Criteria

- SC-001: A pessoa consegue consultar o cadastro existente diretamente pelo erro de CPF ou e-mail.
- SC-002: O nome e demais campos originais continuam preenchidos após abrir a outra aba.
- SC-003: Os cenários de erro não relacionado nunca mostram um link ao cadastro existente.

## Assumptions

- O contrato existente fornece o cadastro conflitante do mesmo negócio.
- A edição já atende a consulta da v1; não é criada uma nova tela de detalhes.
- Nenhuma alteração de backend, dependência ou envio de mensagens faz parte desta entrega.
