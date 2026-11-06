# Ponte histórica — cliente de API da spec 001

**Status**: registro histórico; mantido porque o comentário em `src/shared/api/apiClient.ts` ainda
cita este nome. O contrato HTTP vigente está em [docs/API.md](../../../../../docs/API.md), e a
composição atual em [Arquitetura §2](../../../docs/ARCHITECTURE.md#2-talking-to-the-backend).

A entrega separou tipos OpenAPI gerados, runtime de transporte, fachada Result e repositório da
feature. O motivo era impedir repetição de credenciais, versão e envelope em cada tela, preservando
checagem de tipos. A forma inicialmente documentada importava a composição de `app/` e usava
Categorias como consumidor de demonstração; isso não é receita para código novo. A remoção desse
harness está na [ADR 0038](../../../../../docs/adr/0038-admin-frontend-remove-categories-harness.md).

O formato detalhado antigo permanece no
[Git](https://github.com/evertonschuster/Agenza/blob/38d2dbd99ddb7a28aba39bf1e7434518cf78c391/apps/admin-frontend/specs/001-oidc-shell-scaffold/contracts/api-client-contract.md).
