# Provisionar clientes e escopos OAuth

A [ADR 0015](../../../../docs/decisions/0015-mcp-oauth-proof.md) define a fronteira da autoridade.
O manifesto de desenvolvimento está no
[appsettings](../../../../backend/services/identity-service/IdentityService.Api/appsettings.Development.json),
e sua validação e conversão estão em
[OAuthProvisioningOptions](../../../../backend/services/identity-service/IdentityService.Api/Setup/OAuthProvisioningOptions.cs).

Cadastre o escopo com suas audiências e atribua explicitamente os escopos e recursos ao cliente.
Escolha o perfil interativo público com PKCE e callbacks aprovados, ou o perfil M2M confidencial
com referência a segredo da configuração. Declare a autorização automática apenas para clientes
interativos previamente confiados. Não use nomes de recursos para escolher comportamentos OAuth.

Execute o bootstrap opt-in pelo Aspire para aplicar o manifesto. O cadastro persistido é a fonte
operacional: editar um arquivo com a aplicação ativa não altera permissões automaticamente.
Para desativar um cliente pelo manifesto, use `Enabled: false` e reaplique o bootstrap; omitir o
cliente não significa apagá-lo. Mudanças na política devem passar pelo gerenciador OpenIddict.

Nesta revisão anterior ao primeiro deploy, teste com um volume PostgreSQL novo. Configure
`Postgres__DataVolume` antes de iniciar o Aspire; não reutilize a base da prova de cadastro anônimo.
Os [procedimentos de ambiente](../../../../docs/MONOREPO.md) explicam a orquestração.

Execute `dotnet test backend/services/identity-service/IdentityService.ProtocolTests` para validar
as concessões e a configuração. Use também o smoke real de
[OIDC](../../../../scripts/smoke_oidc_contract.py) e a
[prova do recurso MCP](mcp-oauth.md), sem confundir testes com gerenciadores simulados com validação
HTTP ou PostgreSQL.

O aceite de agnosticismo é configurar um segundo consumidor com seu escopo e audiência sem
alterar controller ou política OAuth. Verifique a recusa cruzada, a renovação com permissões
reduzidas e a desativação de cliente. Uma alteração de cadastro não revoga imediatamente access
tokens JWT já emitidos e aceitos localmente pelos consumidores.
