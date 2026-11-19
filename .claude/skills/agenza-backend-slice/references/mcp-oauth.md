# Provar o vínculo OAuth do MCP

Use o host e o IdentityService pelo Aspire. A [ADR 0015](../../../../docs/decisions/0015-mcp-oauth-proof.md)
delimita a prova e a [issue #232](https://github.com/evertonschuster/Agenza/issues/232) contém o aceite.

## Configurar o cliente

Para adicionar manualmente no aplicativo local, informe `https://localhost:7091/mcp`. A descoberta
OAuth anuncia `https://localhost:7081/connect/register`. Clientes compatíveis com cadastro dinâmico
podem criar sua identificação e abrir o login sem editar `client_id` na configuração local.
O endpoint cadastra clientes públicos com PKCE obrigatório. Após o login, o fluxo retorna
diretamente ao cliente.

Para reproduzir a prova automática desse caminho, use `--register` no lugar de `--client-id` no
script abaixo. O cadastro prévio continua disponível para clientes que o exigem.

O recurso padrão local é `https://localhost:7091/mcp`, e o emissor usa
`https://localhost:7081/`. Ambos usam o certificado HTTPS de desenvolvimento confiável da máquina.
Verifique-o com `dotnet dev-certs https --check --trust`.

O cadastro prévio opcional de clientes vem de
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
MCP ou a versão do cliente. Uma entrada sem `client_id` pode usar o cadastro dinâmico anunciado na
descoberta.

Obtenha o callback exato no cliente MCP antes de cadastrá-lo. Desktop e web podem exigir cadastros
distintos. Configure as variáveis no terminal que inicia o Aspire, por exemplo:

```powershell
$env:IdentityClients__Mcp__Clients__1__ClientId = 'agenza-mcp-proof'
$env:IdentityClients__Mcp__Clients__1__RedirectUris__0 = 'http://127.0.0.1:5099/callback'
dotnet run --project backend/AppHost --launch-profile http
```

Esse callback pertence exclusivamente ao script de prova abaixo. Para o ChatGPT, use o endereço
informado pela configuração OAuth real. O cliente recebe seu `client_id`, usa Authorization Code
com PKCE S256 e solicita `openid profile tenant_id mcp:connect offline_access`. Os endpoints são
descobertos no IdentityService. O parâmetro `resource` deve coincidir com o recurso configurado.

Para um ambiente acessível pelo ChatGPT web, configure URLs alcançáveis para o MCP e o emissor:

- `Mcp__Resource` no host MCP e `IdentityClients__Mcp__Resource` no IdentityService devem coincidir.
- `Identity__Authority` no MCP deve apontar para o emissor.
- `Identity__PublicIssuer` no IdentityService deve coincidir com o issuer publicado na descoberta.
- Cadastre os callbacks exatos e mantenha os certificados e a validação HTTPS habilitados.

Siga o bootstrap existente para aplicar o cadastro no ambiente controlado. A implantação
definitiva é tratada na #237.

## Executar a prova do servidor

Para uma execução isolada, configure `Postgres__DataVolume` no terminal do Aspire com um nome de
volume exclusivo do teste. O volume padrão continua sendo `agenza-postgres-data`.

Com a stack saudável e o cliente do exemplo cadastrado, configure no terminal do teste
`AGENZA_MCP_TEST_PASSWORD` e `AGENZA_MCP_REST_CLIENT_SECRET`. Use uma conta do ambiente controlado
e o segredo do cliente `assistant-service-worker` desse ambiente. Execute na raiz:

```powershell
python scripts/smoke_mcp_oauth.py --client-id agenza-mcp-proof --callback http://127.0.0.1:5099/callback --email owner@demo.local
```

O script verifica descoberta, login inválido e válido com retorno direto ao cliente, proteção do
formulário de login, PKCE, recurso, chamada autenticada de `hello_world`, renovação, reutilização de código, token REST
e header de tenant divergente. Usa cookies e códigos reais e não imprime credenciais nem tokens.
A tentativa de reutilizar um código pode revogar a autorização da própria execução.

## Provar os clientes reais

Após cadastrar cada cliente e selecionar OAuth na conexão MCP, conclua o login e execute
`hello_world`. Repita no ChatGPT Desktop e no ChatGPT web pelo navegador do
celular. Registre na issue a versão, a conta/plano, o dispositivo, os callbacks e o resultado de
cada contexto, com evidências sem segredos.

O teste do servidor valida o protocolo. O aceite dos clientes permanece pendente até demonstrar
o vínculo, o retorno ao chat e a chamada autenticada em cada contexto exigido.
