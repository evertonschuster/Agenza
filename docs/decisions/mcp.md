# Decisions: OAuth authority and MCP resource

The largest section of [platform.md](platform.md), in its own file.

## Decision

- **The identity service is a generic OAuth authority.** It knows protocols, users, clients,
  resources and scopes. Identifiers such as `mcp:connect` are registration data and never select a
  branch of the OAuth flow; the authority does not reference the MCP SDK or interpret business
  operations. A resource host owns its transport, publishes its protected-resource metadata and
  authorizes its own operations.
- **Two grants.** Authorization Code with PKCE S256 for interactive public clients, Client
  Credentials for confidential services. Refresh is an explicit client permission. Automatic
  authorization is limited to interactive clients that declare it, with no consent screen. An M2M
  client represents a service and gets no tenant.
- **The persisted OpenIddict registration is the operational source.** The `DatabaseSeeder` defines clients and
  provisions them and the configured `OAuth` scopes through the opt-in bootstrap; it is not a second allowlist read per
  request. A client left out of the definitions is not deleted: disabling is explicit, and it stops new
  tokens while JWTs already issued stay valid until they expire wherever they are validated locally.
- **A grant never widens.** Issuance uses the scopes allowed to the client and the resources of
  those scopes; code exchange and refresh keep only what both the original grant and the current
  registration allow. Changing tenant needs a new login. OpenIddict keeps validating clients,
  grants, callbacks, PKCE and tokens.
- **The MCP resource has its own audience.** Its tools need a user, a tenant and the matching scope;
  REST API tokens and M2M tokens do not authorize them.
- **Loopback callbacks are exact, except by opt-in.** Native clients register full callbacks and
  only the port varies. `AllowAnyLoopbackRedirectPath` lets a public native PKCE client use any path
  on HTTP `127.0.0.1`, a deliberate exception to RFC 8252 §8.4, without query, fragment,
  credentials, `localhost`, IPv6 or alternative IPv4 forms. The full callback stays bound to the
  code and must match on exchange. The exception depends on the client, not on the server's
  environment. A public `client_id` and PKCE do not authenticate the application.
- **No anonymous dynamic registration and no CIMD.** A preconfigured integration supplies its OAuth
  client to the platform and uses the authority's permissions, without MCP knowledge in the OAuth
  mechanism.

## Why

Keeping resource knowledge out of the authority lets a second consumer be configured with its own
scope and audience without changing the controller or the grant policy.

## Rejected

- **Conditioning the authority's policy on `mcp:connect` or on platform names.** Resources are
  configured consumers of the same protocol.
- **Resolving client metadata and granting fixed MCP permissions in the same operation.**
- **Letting the frontend or an MCP tool choose the authorized tenant.**
- **Anonymous registration with automatic authorization**, to avoid configuring a `client_id`.
- **A new identity framework or service.** OpenIddict already manages the OAuth contracts.
