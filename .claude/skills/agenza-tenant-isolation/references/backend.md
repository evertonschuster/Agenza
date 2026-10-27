# Trace server-side tenant scope

The [backend guide](../../../../backend/docs/ARCHITECTURE.md#5-tenancy-and-persistence) owns the
persistence policy. Use this reference to inspect the affected enforcement path and choose evidence.

## Authentication and HTTP entry

Read [IdentityJwtBearerExtensions](../../../../backend/shared/Admin.Identity.Client/IdentityJwtBearerExtensions.cs)
for authority, audience and claim mapping, then
[HttpContextTenantAccessor](../../../../backend/shared/Admin.Identity.Client/HttpContextTenantAccessor.cs)
for the claim source and
[TenantHeaderFilter](../../../../backend/shared/Admin.Identity.Client/TenantHeaderFilter.cs)
for header/claim comparison.

- Verify the route actually uses authentication and registers the filter; registering its service
  in DI alone does not install a global MVC filter.
  [services-service Program](../../../../backend/services/services-service/ServicesService.Api/Program.cs)
  is the tenant-owned API reference.
- A missing/unparseable header, absent/unparseable claim or mismatch is rejected by the filter.
  The accessor reads the authenticated principal, never the header being compared.
  Preserve `MapInboundClaims = false` where accessors depend on the token's original claim names.
- Inspect any `IgnoreTenant` exception by endpoint and policy. A tenant-free provisioning endpoint
  needs its own authorization, as
  [TenantsController](../../../../backend/services/identity-service/IdentityService.Api/Controllers/TenantsController.cs)
  checks `identity-admin`. Do not install tenant requirements indiscriminately on OIDC endpoints.
- A validated tenant does not establish a role/permission check. Follow the endpoint's actual
  policy rather than assuming an additional authorization layer.

## Reads, writes and relationships

For a query-filter or context change, read
[ModelBuilderExtensions](../../../../backend/shared/Admin.SharedKernel.EntityFrameworkCore/ModelBuilderExtensions.cs),
[ServicesDataContext](../../../../backend/services/services-service/ServicesService.Infrastructure/Persistence/ServicesDataContext.cs)
and the
[tenant-scoping tests](../../../../backend/services/services-service/ServicesService.PersistenceTests/ServicesDataContextTenantScopingTests.cs).

The tenant predicate must remain tied to the context instance used for the query: a captured GUID
constant can be reused through EF's cached model. Check two tenants against the same model.
The context's no-tenant fallback is `Guid.Empty`; it must not become permission to read globally.
Named `Tenant` and `SoftDelete` filters are independent. A deleted-row query must retain tenant
scope; unqualified `IgnoreQueryFilters()` disables both.

For writes, trace
[AuditableEntitySaveChangesInterceptor](../../../../backend/services/services-service/ServicesService.Infrastructure/Persistence/Interceptors/AuditableEntitySaveChangesInterceptor.cs)
and its [tests](../../../../backend/services/services-service/ServicesService.PersistenceTests/AuditableEntitySaveChangesInterceptorTests.cs).
It assigns the current tenant to an Added tenant-owned entity whose tenant is empty, or throws
when the provider has none. It does not reassign a prepopulated tenant or independently validate
the tenant on every Modified entity. Do not treat the interceptor as blanket write authorization:
trace how the entity entered the context and prevent a business caller from supplying its tenant.

Inspect aggregate children, alternate keys and composite tenant FKs in the relevant configuration;
[ClientConfiguration](../../../../backend/services/services-service/ServicesService.Infrastructure/Persistence/Configurations/ClientConfiguration.cs)
is a live example. An Id-only relationship can bypass tenant ownership even when both rows were
loaded correctly. Model metadata and EF InMemory evidence do not prove that PostgreSQL rejects it.

For connection/role changes, read
[001-service-roles.sh](../../../../infra/postgres/init/001-service-roles.sh) and the AppHost wiring.
Roles restrict ownership and grants between service schemas, not between tenants within a schema.
Check both positive grants and revocations using the actual application role, not an administrator.

## FastAPI entry and delegation

Trace [verify_token.py](../../../../ai-services/assistant-service/app/auth/verify_token.py) before
[tenant_context.py](../../../../ai-services/assistant-service/app/auth/tenant_context.py).
The validator obtains a signing key through JWKS and checks the JWT with the configured algorithm,
issuer and audience. The context dependency then compares UUID claim/header values; routes consume
the resulting context rather than establishing a second authority from raw request values.

The context carries subject and scope; carrying scope is not an operation-level scope check.
Health/readiness can remain tenant-free. A tenant-owned downstream call delegates the caller's
access token with the validated header, as required by
[ADR 0022](../../../../docs/adr/0022-ai-tenant-context-and-delegation.md).
[ServiceTokenClient](../../../../ai-services/assistant-service/app/auth/service_token_client.py)
only obtains/caches a client-credentials token; it does not add a tenant identity. Reserve it for
explicitly tenant-free control-plane work. Background tenant access needs a designed job identity
and immutable tenant context, not a process-wide current tenant.

## Choose the proof

Use existing persistence tests for tenant assignment, named filters and context/model-cache behavior.
Trusted provider doubles isolate those mechanisms; they do not exercise JWT validation.
The [AI-service tests](../../../../ai-services/assistant-service/tests/) exercise its token/context
dependencies. Select existing cases that cover the changed behavior and add a regression when a
meaningful case is missing; changing a test file is not itself the acceptance criterion.

Real FK/role enforcement and concurrent uniqueness need PostgreSQL evidence. Follow
[backend tests policy](../../../../backend/docs/ARCHITECTURE.md#9-tests) and report what was actually
run on a disposable database. Historical ADR references to an architecture guard do not prove a
current check exists. State which properties remain unverified.
