# Decisions: OAuth authority and MCP resource

The largest section of [platform.md](platform.md), in its own file.

## Decision

- **The identity service is a generic OAuth authority.** It knows protocols, users, clients,
  resources and scopes. Scope identifiers are registration data and never select a
  branch of the OAuth flow; the authority does not reference the MCP SDK or interpret business
  operations. A resource host owns its transport, publishes its protected-resource metadata and
  authorizes its own operations.
- **Two grants.** Authorization Code with PKCE S256 for interactive public clients, Client
  Credentials for confidential services. Refresh is an explicit client permission. Consent is
  implicit for all interactive clients, with no consent screen or repeated consent check during
  code exchange and refresh. An M2M client represents a service and gets no tenant.
- **The persisted OpenIddict registration is the operational source.** The `DatabaseSeeder` defines clients and
  provisions them and their scopes using native OpenIddict descriptors through the opt-in bootstrap; it is not a second allowlist read per
  request. A client left out of the definitions is not deleted: disabling is explicit, and it stops new
  tokens while JWTs already issued stay valid until they expire wherever they are validated locally.
- **SPA and MCP share application access.** Both interactive clients use the same operation
  authorization for a user and tenant. The resource scopes are `services-api` for REST and
  `services-mcp` for MCP. There is no application-maintained permission matrix that gives these interfaces different business capabilities. OpenIddict owns
  client, endpoint, grant, scope and resource permission validation.
- **A grant never widens.** The token controller builds fresh user claims on exchange and refresh,
  keeping the original scopes and audiences or a requested reduction. It does not reapply a separate
  client-permission policy. Changing tenant needs a new login; current user roles are rebuilt.
  Removing a permission from a client's registration is not an application-level revocation of
  previously granted scopes when refresh omits them.
- **The MCP resource has its own audience.** Its tools use the same shared authenticated-tenant
  policy as REST, without additional subject-format or scope requirements. The OAuth clients have
  dedicated resource scopes, without scope checks in the shared operation policy. The requested
  resource selects the destination, not different business permissions. Tokens destined only for REST and M2M tokens do not authorize MCP tools.
- **An MCP host is an entry point of its own context.** Its tools call that context's Application
  handlers in process, with the user and tenant from the validated claims, as the REST controllers
  do. Each context that exposes tools gets its own host, resource and audience.
- **Loopback callbacks use the standard OpenIddict validation.** Native clients register full
  callbacks and only the port varies. Generated paths are not accepted; the callback must match
  a registered path. The full callback remains bound to the authorization code.
- **No anonymous dynamic registration and no CIMD.** A preconfigured integration supplies its OAuth
  client to the platform and uses the authority's permissions, without MCP knowledge in the OAuth
  mechanism.

## Why

Keeping resource knowledge out of the authority lets a second consumer be configured with its own
scope and audience without changing the controller or the token issuance flow.

## Rejected

- **Conditioning token issuance on platform names.** Resources are
  configured consumers of the same protocol.
- **Resolving client metadata and granting fixed MCP permissions in the same operation.**
- **Letting the frontend or an MCP tool choose the authorized tenant.**
- **An MCP tool calling its context's REST API.** The MCP token must not be passed through, the
  authority has no token exchange, and an M2M token carries no tenant.
- **Anonymous registration with automatic authorization**, to avoid configuring a `client_id`.
- **A new identity framework or service.** OpenIddict already manages the OAuth contracts.
