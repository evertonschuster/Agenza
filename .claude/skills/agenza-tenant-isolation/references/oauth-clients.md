# Provision OAuth clients and scopes

The authority boundary and its limits are in
[decisions/mcp.md](../../../../docs/decisions/mcp.md). Define clients in
[DatabaseSeeder](../../../../backend/services/identity-service/IdentityService.Api/Seed/DatabaseSeeder.cs).
Scopes remain in the `OAuth:Scopes` section of
[appsettings.Development.json](../../../../backend/services/identity-service/IdentityService.Api/appsettings.Development.json);
secrets stay in external configuration.
[OAuthProvisioningOptions](../../../../backend/services/identity-service/IdentityService.Api/Setup/OAuthProvisioningOptions.cs)
validates the definitions and converts clients to OpenIddict descriptors.

Register each scope with its audiences and give the client its scopes and resources explicitly.
Choose the interactive public profile, with PKCE and approved callbacks, or the confidential M2M
profile, with a secret reference from configuration. Consent is implicit for all interactive
clients; there is no consent screen. Do not use resource names to choose OAuth behavior.

Apply the definitions through the opt-in bootstrap in Aspire; changing them while the application
runs changes no persisted permission. To disable a client, set `Enabled = false` in its definition
and reapply the bootstrap. Policy changes go through the OpenIddict manager.

Test provisioning changes on a new PostgreSQL volume: set `Postgres__DataVolume` before starting
Aspire. The [development guide](../../../../docs/DEVELOPMENT.md) covers the orchestration.

`dotnet test backend/services/identity-service/IdentityService.ProtocolTests` checks grants and
configuration with simulated managers; it proves neither HTTP nor PostgreSQL. For those, run the
real [OIDC smoke](../../../../scripts/smoke_oidc_contract.py) and the [MCP proof](mcp-oauth.md).

A second consumer is configured with its own scope and audience without changing the controller or
the grant policy. Check cross-resource refusal, refresh with reduced permissions and client
disabling.

## Local native client

Register full callbacks; only the port varies for native clients. Generated callback paths are
not supported. Use the standard OpenIddict validation and keep the callback path registered in
`DatabaseSeeder`.

Check the real callback, support for a preconfigured `client_id`, and that the browser and listener
reach the same loopback machine. Run the OAuth smoke to prove registered callbacks work with
variable ports and unregistered paths are refused. The team prepares this configuration; the end
user does not register clients.
