# Session boundary

- Protected content is removed on identity change; feedback is in pt-BR with an explicit login action.
- API middleware uses the live session and joins request and session cancellation signals.
- The OIDC adapter removes the stored user and stops renewal; late callbacks cannot clear the failure or restore credentials.
- Explicit login waits for cleanup and asks the provider for login again.
- No HTTP payload or OpenAPI schema changes.
