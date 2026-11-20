# Provar o vínculo OAuth do MCP

Use o host MCP e o IdentityService pelo Aspire. A
[OAuth/MCP](../../../../docs/decisions/mcp.md) define a fronteira entre autoridade e
recurso; o [provisionamento OAuth](oauth-clients.md) define como cadastrar clientes e escopos.

## Ambiente local

Inicie o Aspire com um volume PostgreSQL novo para esta configuração. O host é
`https://localhost:7091/mcp` e o emissor é `https://localhost:7081/`. Confira o certificado com
`dotnet dev-certs https --check --trust`; não desabilite validação TLS.

O manifesto `OAuth` do Identity provisiona `agenza-mcp` como cliente público nativo. Obtenha o
callback no aplicativo antes de cadastrar outro consumidor; endereço e caminho devem coincidir,
e somente a porta de loopback pode variar conforme o comportamento nativo do OpenIddict.

No cliente Codex local:

```toml
[mcp_servers.agenza-local]
url = "https://localhost:7091/mcp"
scopes = ["openid", "profile", "tenant_id", "mcp:connect", "offline_access"]

[mcp_servers.agenza-local.oauth]
client_id = "agenza-mcp"
```

Execute `codex mcp login agenza-local`. O login é feito no Identity e retorna diretamente ao cliente.
A emissão e a renovação usam o cadastro persistido, sem regra específica do recurso no controller.

## Claude Desktop com ponte local

Conectores remotos adicionados por URL no Claude são acessados pela nuvem, inclusive na interface
desktop. Para usar localhost sem expor a aplicação, configure uma ponte stdio na máquina.
A versão validada é `mcp-remote@0.16.7`, executada com Node e `--use-system-ca`, transporte
`http-only`, URL `https://localhost:7091/mcp` e `--host 127.0.0.1`.

Use `--static-oauth-client-info` apontando para JSON com `client_id: agenza-mcp`, e
`--static-oauth-client-metadata` apontando para JSON com método `none` e escopos
`openid profile tenant_id mcp:connect offline_access`. O callback aprovado da ponte é
`http://127.0.0.1/oauth/callback`. Preserve as demais entradas e um backup do
`claude_desktop_config.json` ativo e reabra o aplicativo após configurar `agenza-local`.

## Verificação

Com a stack ativa, execute `python scripts/smoke_mcp_oauth.py` da raiz. O teste usa o cliente local
e o usuário de demonstração. Para outro cadastro, configure `AGENZA_IDENTITY_URL`, `AGENZA_MCP_URL`,
`AGENZA_MCP_CLIENT_ID`, `AGENZA_MCP_CALLBACK`, `AGENZA_TEST_EMAIL` e `AGENZA_TEST_PASSWORD`.

A opção `AGENZA_TEST_SECOND_RESOURCE=1` habilita o aceite do segundo recurso. Ela exige um cliente
`protocol-test`, callback `http://127.0.0.1/protocol-test/callback`, escopos
`openid tenant_id example:read offline_access` e audiência `https://localhost:7091/second-resource`
provisionados apenas na base de teste. O teste verifica audiência, escopos cruzados e renovação;
não exige implementar um segundo servidor de negócio.

No aplicativo real, habilite a conexão na conversa e solicite `hello_world`. Registre o retorno,
a versão do aplicativo e os callbacks usados, sem tokens ou segredos. O sucesso do consumidor HTTP
de teste não substitui essa execução no aplicativo.

## Integração remota

A conexão remota precisa alcançar MCP e Identity por HTTPS. `Mcp:Resource` deve coincidir com a
audiência concedida pelo Identity; `Identity:Authority` do host aponta para o emissor e
`Identity:PublicIssuer` coincide com a descoberta. Cadastre o callback exibido pela plataforma.

Não há DCR anônimo nem CIMD nesta entrega. Uma integração pré-configurada deve fornecer seu cliente
OAuth à plataforma; cadastrar somente no Identity não torna o identificador conhecido pelo chat.
A validação real na nuvem continua dependente de URLs públicas de teste.
