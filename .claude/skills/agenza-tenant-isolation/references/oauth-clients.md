# Provision OAuth clients and scopes

The authority boundary and its limits are in
[decisions/mcp.md](../../../../docs/decisions/mcp.md). The development manifest is the `OAuth`
section of
[appsettings.Development.json](../../../../backend/services/identity-service/IdentityService.Api/appsettings.Development.json);
[OAuthProvisioningOptions](../../../../backend/services/identity-service/IdentityService.Api/Setup/OAuthProvisioningOptions.cs)
validates and converts it.

Register each scope with its audiences and give the client its scopes and resources explicitly.
Choose the interactive public profile, with PKCE and approved callbacks, or the confidential M2M
profile, with a secret reference from configuration. Declare automatic authorization only for an
interactive client that is already trusted. Do not use resource names to choose OAuth behavior.

Apply the manifest through the opt-in bootstrap in Aspire; editing the file while the application
runs changes no permission. To disable a client, set `Enabled: false` and reapply the bootstrap.
Policy changes go through the OpenIddict manager.

Test a manifest change on a new PostgreSQL volume: set `Postgres__DataVolume` before starting
Aspire. The [development guide](../../../../docs/DEVELOPMENT.md) covers the orchestration.

`dotnet test backend/services/identity-service/IdentityService.ProtocolTests` checks grants and
configuration with simulated managers; it proves neither HTTP nor PostgreSQL. For those, run the
real [OIDC smoke](../../../../scripts/smoke_oidc_contract.py) and the [MCP proof](mcp-oauth.md).

A second consumer is configured with its own scope and audience without changing the controller or
the grant policy. Check cross-resource refusal, refresh with reduced permissions and client
disabling.

## Local native client

Register full callbacks by default; only the port varies for native clients. When the harness needs
variable paths, `AllowAnyLoopbackRedirectPath: true` enables the exception for that public native
PKCE client, and the bootstrap persists it. Never register `*` in `RedirectUris`, and keep the exact
callbacks so the exception can be reverted.

Check the real callback, the support for a preconfigured `client_id`, and that the browser and the
listener reach the same loopback machine. The policy describes the local client, even with a remote
Identity; it does not make every harness compatible.

Run the OAuth smoke to prove variable paths, the refusal of other hosts and of clients without the
opt-in, and the full callback match on code exchange. To revert, disable the option, reapply the
bootstrap and run the smoke with `AGENZA_MCP_ANY_LOOPBACK_PATH=0`: new paths are refused and the
exact callbacks keep working. The team prepares this configuration; the end user does not register
clients.
