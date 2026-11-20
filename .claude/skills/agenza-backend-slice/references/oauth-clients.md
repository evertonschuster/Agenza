# Provisionar clientes e escopos OAuth

A [ADR 0015](../../../../docs/decisions/0015-mcp-oauth-proof.md) define a fronteira da autoridade.
O manifesto de desenvolvimento est√° no
[appsettings](../../../../backend/services/identity-service/IdentityService.Api/appsettings.Development.json),
e sua valida√ß√£o e convers√£o est√£o em
[OAuthProvisioningOptions](../../../../backend/services/identity-service/IdentityService.Api/Setup/OAuthProvisioningOptions.cs).

Cadastre o escopo com suas audi√™ncias e atribua explicitamente os escopos e recursos ao cliente.
Escolha o perfil interativo p√∫blico com PKCE e callbacks aprovados, ou o perfil M2M confidencial
com refer√™ncia a segredo da configura√ß√£o. Declare a autoriza√ß√£o autom√°tica apenas para clientes
interativos previamente confiados. N√£o use nomes de recursos para escolher comportamentos OAuth.

Execute o bootstrap opt-in pelo Aspire para aplicar o manifesto. O cadastro persistido √© a fonte
operacional: editar um arquivo com a aplica√ß√£o ativa n√£o altera permiss√µes automaticamente.
Para desativar um cliente pelo manifesto, use `Enabled: false` e reaplique o bootstrap; omitir o
cliente n√£o significa apag√°-lo. Mudan√ßas na pol√≠tica devem passar pelo gerenciador OpenIddict.

Nesta revis√£o anterior ao primeiro deploy, teste com um volume PostgreSQL novo. Configure
`Postgres__DataVolume` antes de iniciar o Aspire; n√£o reutilize a base da prova de cadastro an√¥nimo.
Os [procedimentos de ambiente](../../../../docs/MONOREPO.md) explicam a orquestra√ß√£o.

Execute `dotnet test backend/services/identity-service/IdentityService.ProtocolTests` para validar
as concess√µes e a configura√ß√£o. Use tamb√©m o smoke real de
[OIDC](../../../../scripts/smoke_oidc_contract.py) e a
[prova do recurso MCP](mcp-oauth.md), sem confundir testes com gerenciadores simulados com valida√ß√£o
HTTP ou PostgreSQL.

O aceite de agnosticismo √© configurar um segundo consumidor com seu escopo e audi√™ncia sem
alterar controller ou pol√≠tica OAuth. Verifique a recusa cruzada, a renova√ß√£o com permiss√µes
reduzidas e a desativa√ß√£o de cliente. Uma altera√ß√£o de cadastro n√£o revoga imediatamente access
tokens JWT j√° emitidos e aceitos localmente pelos consumidores.

## Integrar um cliente nativo local

Mantenha callbacks completos e explÌcitos; para loopback de cliente nativo, apenas a porta pode
variar. Cadastrar `/` n„o autoriza subcaminhos. N„o substitua a validaÁ„o do OpenIddict por wildcard,
nem em desenvolvimento. Essa regra tambÈm vale quando o Identity È remoto e o cliente È local.

Antes de incluir um novo harness, verifique o callback real, sua estabilidade entre instalaÁıes e
execuÁıes, o suporte a `client_id` prÈ-configurado e se navegador e listener alcanÁam a mesma
m·quina de loopback. Cadastre o callback exato, reaplique o bootstrap e execute o smoke OAuth,
incluindo recusa de caminho n„o cadastrado e troca de cÛdigo com callback diferente.

O `client_id` p˙blico identifica uma configuraÁ„o; n„o autentica o programa. PKCE vincula a troca
do cÛdigo ‡ inst‚ncia que iniciou o fluxo, sem comprovar que o aplicativo È confi·vel. AutorizaÁ„o
autom·tica assume essa limitaÁ„o. A equipe prepara a integraÁ„o, sem delegar o cadastro ao usu·rio.
Se o caminho realmente variar e n„o puder ser estabilizado por configuraÁ„o ou ponte, avalie
registro controlado como decis„o separada; os callbacks desta m·quina n„o provam suporte universal.
