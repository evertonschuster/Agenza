# Abordagem entregue: proteção da identidade

**Status**: implementada; registro histórico do [PR #200](https://github.com/evertonschuster/Agenza/pull/200).
O comportamento e o aceite estão em [spec.md](spec.md); as decisões e alternativas permanecem na
[ADR 0083](../../../../docs/adr/0083-admin-frontend-reject-session-identity-changes.md).

## Estado e fronteiras

O reducer compara o subject OIDC e o tenant derivado do token com a identidade aceita antes de
substituir credenciais. Renovar a mesma identidade preserva o escopo de requisições e a interface.
Uma mudança ou desaparecimento de identificação durante a sessão autenticada limpa usuário, tenant
e credenciais e mantém identity_changed até LOGIN_STARTED. A autenticação inicial sem identificação
continua informando a falha específica da claim ausente.

O store interrompe o escopo de requisições ao sair da autenticação; o middleware combina esse sinal
com o cancelamento do chamador. ProtectedRoute desmonta o conteúdo protegido. O adapter OIDC para a
renovação, remove as credenciais persistidas e espera essa limpeza antes de pedir login explícito.
Falha de limpeza não libera a sessão em memória. Eventos antigos, respostas iniciais superadas e
callbacks após desmontagem não restauram a identidade anterior.

A validação e autorização continuam no servidor. Cancelar uma requisição não desfaz uma escrita já
processada. A entrega não criou claim decoder, registro global de requisições, cache por tenant,
endpoint, dependência ou alteração de OpenAPI.

## Fontes da implementação e verificação

- [Reducer e testes](../../src/shared/session/sessionMachine.test.ts): renovação, troca ou ausência de
  identificação e bloqueio até novo login.
- [Store e testes](../../src/shared/session/sessionStore.test.ts) e
  [middleware e testes](../../src/shared/api/apiClient.test.ts): duração e cancelamento das requisições.
- [Adapter OIDC e testes](../../src/features/auth/model/sessionDriver.test.ts): eventos tardios,
  limpeza e login explícito.
- [Proteção de rota e testes](../../src/features/auth/ui/ProtectedRoute.test.tsx): retirada da UI protegida.

Os links identificam evidência no código, sem declarar uma nova execução da suíte. Comandos e gates
pertencem ao [README](../../README.md#comandos) e à [QUALITY](../../../../docs/QUALITY.md).
