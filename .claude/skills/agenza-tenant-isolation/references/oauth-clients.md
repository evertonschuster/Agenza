# Provision OAuth clients and scopes

The authority boundary and its limits are in
[decisions/mcp.md](../../../../docs/decisions/mcp.md). Define clients and scopes directly with native
OpenIddict descriptors in
[DatabaseSeeder](../../../../backend/services/identity-service/IdentityService.Api/Seed/DatabaseSeeder.cs).
Keep each client explicit and secrets in external configuration. OpenIddict validates descriptors
when the bootstrap creates or updates their registrations.

Register each scope with its audiences. Give the SPA the `services-api` scope and REST audience,
and the MCP client the `services-mcp` scope and MCP audience in `DatabaseSeeder`. Their operation authorization policy remains shared and does
not require either scope.
Keep M2M clients as service identities without user roles or tenant claims.
Choose the interactive public profile, with PKCE and approved callbacks, or the confidential M2M
profile, with a secret reference from configuration. Consent is implicit for all interactive
clients; there is no consent screen. Do not use resource names to choose OAuth behavior.

Apply the definitions through the opt-in bootstrap in Aspire; changing them while the application
runs changes no persisted permission. Removing a client from the definitions does not delete an existing registration.
Registration changes go through the OpenIddict manager.

Test provisioning changes on a new PostgreSQL volume: set `Postgres__DataVolume` before starting
Aspire. The [development guide](../../../../docs/DEVELOPMENT.md) covers the orchestration.

Verify grants and configuration with the real [OIDC smoke](../../../../scripts/smoke_oidc_contract.py)
and the [MCP proof](mcp-oauth.md).

For MCP requests, the `resource` parameter selects the MCP audience. `OAuth:DefaultResource` selects
the default audience for requests without that parameter, such as the SPA and worker, when it is
mapped to the granted scopes. Verify dedicated SPA/MCP scopes, equal user roles, audience validation and refresh
with reduced scopes.

## Local native client

Register full callbacks; only the port varies for native clients. Generated callback paths are
not supported. Use the standard OpenIddict validation and keep the callback path registered in
`DatabaseSeeder`.

Check the real callback, support for a preconfigured `client_id`, and that the browser and listener
reach the same loopback machine. Run the OAuth smoke to prove registered callbacks work with
variable ports and unregistered paths are refused. The team prepares this configuration; the end
user does not register clients.
