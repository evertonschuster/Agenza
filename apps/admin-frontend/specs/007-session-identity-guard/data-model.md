# Data and transitions

- `SessionPrincipal` carries the OIDC subject; `Session` retains the accepted subject.
- Tenant continues through `resolveTenantContext`; no new claim decoder is added.
- Same subject and tenant accepts token renewal.
- Different subject or tenant transitions to unauthenticated `identity_changed`, clears identity and credentials, and aborts the outgoing request scope.
- Only `LOGIN_STARTED` releases that state. Missing subject or tenant fails closed.
