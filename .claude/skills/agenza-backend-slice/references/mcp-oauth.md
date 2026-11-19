# Provar o vínculo OAuth do MCP

Use o host e o IdentityService pelo Aspire. A [ADR 0015](../../../../docs/decisions/0015-mcp-oauth-proof.md)
delimita a prova e a [issue #232](https://github.com/evertonschuster/Agenza/issues/232) contém o aceite.

## Configurar o cliente

Cadastre previamente cada cliente confiável no IdentityService, com o callback exato informado
pelo aplicativo. Não há endpoint de cadastro dinâmico. Configure o `client_id` recebido no cliente
MCP e informe `https://localhost:7091/mcp` para um consumidor executado nesta máquina.
Após o login, o fluxo retorna diretamente ao cliente, sem consentimento adicional.

O recurso padrão local é `https://localhost:7091/mcp`, e o emissor usa
`https://localhost:7081/`. Ambos usam o certificado HTTPS de desenvolvimento confiável da máquina.
Verifique-o com `dotnet dev-certs https --check --trust`.

O cadastro obrigatório de clientes vem de
`IdentityClients:Mcp:Clients`, com `ClientId`, `DisplayName` opcional e `RedirectUris` obrigatórias.
`ApplicationType` distingue clientes `web` e `native`, com `web` como padrão.
O bootstrap do IdentityService cadastra clientes públicos com PKCE obrigatório e escopo
`mcp:connect`. O ambiente de desenvolvimento inclui `agenza-desktop`, um cliente nativo com o
callback observado para `https://localhost:7091/mcp` na versão instalada do aplicativo.

Na configuração local do aplicativo, associe a entrada MCP ao cliente pré-cadastrado:

```toml
[mcp_servers.agenza]
url = "https://localhost:7091/mcp"
scopes = ["openid", "profile", "tenant_id", "mcp:connect", "offline_access"]

[mcp_servers.agenza.oauth]
client_id = "agenza-desktop"
```

Execute `codex mcp login agenza` e abra a URL de autorização informada. A versão instalada pode
usar uma porta variável no loopback. O OpenIddict aceita essa variação para clientes nativos,
preservando a comparação do endereço e do caminho. Confira o callback emitido ao alterar a URL
MCP ou a versão do cliente. O cliente precisa permitir a configuração de `client_id`; uma conexão
que dependa exclusivamente de cadastro dinâmico não é compatível com este modelo.

Obtenha o callback exato no cliente MCP antes de cadastrá-lo. Desktop e web podem exigir cadastros
distintos. Use o endereço informado pela configuração OAuth real. O cliente recebe seu `client_id`, usa Authorization Code
com PKCE S256 e solicita `openid profile tenant_id mcp:connect offline_access`. Os endpoints são
descobertos no IdentityService. O parâmetro `resource` deve coincidir com o recurso configurado.

Uma interface desktop também pode executar o conector na nuvem. Nesse caso, assim como no
ChatGPT web, `localhost` não alcança esta máquina. Configure URLs HTTPS alcançáveis para o MCP
e o emissor; um túnel apenas para o MCP não basta:

- `Mcp__Resource` no host MCP e `IdentityClients__Mcp__Resource` no IdentityService devem coincidir.
- `Identity__Authority` no MCP deve apontar para o emissor.
- `Identity__PublicIssuer` no IdentityService deve coincidir com o issuer publicado na descoberta.
- Cadastre os callbacks exatos e mantenha os certificados e a validação HTTPS habilitados.

Siga o bootstrap existente para aplicar o cadastro no ambiente controlado. A implantação
definitiva é tratada na #237.

## Provar os clientes reais

Para uma execução isolada, configure `Postgres__DataVolume` no terminal do Aspire com um nome de
volume exclusivo do teste. O volume padrão continua sendo `agenza-postgres-data`.

Após cadastrar cada cliente e selecionar OAuth na conexão MCP, conclua o login e execute
`hello_world`. Repita no ChatGPT Desktop e no ChatGPT web pelo navegador do
celular. Registre na issue a versão, a conta/plano, o dispositivo, os callbacks e o resultado de
cada contexto, com evidências sem segredos.

O aceite dos clientes permanece pendente até demonstrar
o vínculo, o retorno ao chat e a chamada autenticada em cada contexto exigido.

## Verificar a fronteira HTTP

Com a stack Aspire de desenvolvimento ativa, execute `python scripts/smoke_mcp_oauth.py` da raiz.
O teste usa o login de demonstração e o cliente desktop cadastrados neste ambiente. Para outro
cadastro, configure `AGENZA_IDENTITY_URL`, `AGENZA_MCP_URL`, `AGENZA_MCP_CLIENT_ID` e
`AGENZA_MCP_CALLBACK`; credenciais de teste vêm de `AGENZA_TEST_EMAIL` e `AGENZA_TEST_PASSWORD`.
A validação TLS permanece habilitada. O teste cobre o protocolo com um consumidor HTTP local;
o aceite nos aplicativos reais continua separado.

## Claude Desktop com ponte local

O conector remoto adicionado por URL no Claude é acessado pela nuvem da Anthropic, inclusive
quando a interface é desktop. Para testar o host HTTP em localhost sem expô-lo, use uma ponte
stdio local. O cadastro de desenvolvimento `claude-desktop-local` usa o callback nativo
`http://127.0.0.1/oauth/callback`, com porta variável.

Na máquina do teste, configure uma entrada `agenza-local` no `claude_desktop_config.json` ativo,
preservando as demais entradas e um backup. A versão da ponte validada é `mcp-remote@0.16.7`.
Execute-a com Node e `--use-system-ca`, URL `https://localhost:7091/mcp`, transporte `http-only`,
`--host 127.0.0.1`, `--static-oauth-client-info` apontando para JSON com o `client_id`
`claude-desktop-local`, e `--static-oauth-client-metadata` apontando para JSON com
`token_endpoint_auth_method: none` e escopos `openid profile tenant_id mcp:connect offline_access`.
Não desabilite a validação TLS. A ponte é uma ferramenta da máquina de teste, não uma dependência
do backend nem um novo transporte do host MCP.

Reabra o Claude para carregar a configuração. Habilite `agenza-local` na conversa e solicite a
execução de `hello_world`. A verificação direta da ponte não substitui essa chamada no aplicativo.
