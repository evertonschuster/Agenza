# Prove the MCP OAuth link

Run the MCP host and the identity service through Aspire. The boundary is in
[decisions/mcp.md](../../../../docs/decisions/mcp.md); registering clients and scopes is in
[oauth-clients.md](oauth-clients.md).

## Local environment

Start Aspire on a new PostgreSQL volume. The host is `https://localhost:7091/mcp` and the issuer is
`https://localhost:7081/`. Check the certificate with `dotnet dev-certs https --check --trust`; do
not disable TLS validation.

The Identity `DatabaseSeeder` provisions `agenza-mcp` as a public native client. Get the app's
callback before registering another consumer: address and path must match, and only the loopback
port varies.

For a local Codex client:

```toml
[mcp_servers.agenza-local]
url = "https://localhost:7091/mcp"
scopes = ["openid", "profile", "tenant_id", "services-mcp", "offline_access"]

[mcp_servers.agenza-local.oauth]
client_id = "agenza-mcp"
```

Run `codex mcp login agenza-local`. The login happens in Identity and returns straight to the
client.

## Claude Desktop through a local bridge

Connectors added by URL in Claude are reached from the cloud, the desktop app included. To use
localhost without exposing the application, configure a stdio bridge on the machine: `mcp-remote`
run by Node with `--use-system-ca`, the `http-only` transport, the URL `https://localhost:7091/mcp`
and `--host 127.0.0.1`.

Pass `--static-oauth-client-info` with a JSON holding `client_id: agenza-mcp`, and
`--static-oauth-client-metadata` with a JSON holding the method `none` and the scopes
`openid profile tenant_id services-mcp offline_access`. The bridge's approved callback is
`http://127.0.0.1/oauth/callback`. Back up the active `claude_desktop_config.json`, keep its other
entries, add `agenza-local` and reopen the app.

## Verification

With the stack running, run `python scripts/smoke_mcp_oauth.py` from the root. It uses the local
client and the demo user; for another registration set `AGENZA_IDENTITY_URL`, `AGENZA_MCP_URL`,
`AGENZA_MCP_CLIENT_ID`, `AGENZA_MCP_CALLBACK`, `AGENZA_TEST_EMAIL` and `AGENZA_TEST_PASSWORD`.

In the real app, enable the connection in the conversation and ask for `hello_world`. Record the
result, the app version and the callbacks used in the PR, without tokens or secrets. A passing HTTP
test consumer does not replace that run.

## Remote integration

A remote connection must reach MCP and Identity over HTTPS. `Mcp:Resource` matches the audience
Identity grants; the host's `Identity:Authority` points to the issuer, and `Identity:PublicIssuer`
matches discovery. Register the callback the platform shows. Registering a client only in Identity
does not make the chat platform know its identifier, and a real cloud check needs public HTTPS test
URLs.
