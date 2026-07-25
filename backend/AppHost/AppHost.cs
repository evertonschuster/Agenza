var builder = DistributedApplication.CreateBuilder(args);

var postgresPassword = builder.AddParameter("postgres-password", "postgres", secret: true);
var identityDbPassword = builder.AddParameter(
    "identity-db-password",
    "dev-identity-db-change-me",
    secret: true);
var servicesDbPassword = builder.AddParameter(
    "services-db-password",
    "dev-services-db-change-me",
    secret: true);
var workerSecret = builder.AddParameter(
    "assistant-worker-secret",
    "dev-assistant-worker-secret-change-me",
    secret: true);
var provisioningSecret = builder.AddParameter(
    "tenant-provisioning-secret",
    "dev-tenant-provisioning-secret-change-me",
    secret: true);

var postgres = builder.AddPostgres("postgres", password: postgresPassword)
    .WithHostPort(5432)
    .WithEnvironment("POSTGRES_DB", "appdb")
    .WithEnvironment("IDENTITY_DB_PASSWORD", identityDbPassword)
    .WithEnvironment("SERVICES_DB_PASSWORD", servicesDbPassword)
    .WithInitFiles("../../infra/postgres/init")
    .WithDataVolume("agenza-postgres-data");
var appdb = postgres.AddDatabase("appdb", "appdb");

var postgresEndpoint = postgres.GetEndpoint("tcp");
var identityDatabase = builder.AddConnectionString(
    "identity-database",
    ReferenceExpression.Create(
        $"Host={postgresEndpoint.Property(EndpointProperty.Host)};" +
        $"Port={postgresEndpoint.Property(EndpointProperty.Port)};" +
        $"Database=appdb;Username=identity_app;Password={identityDbPassword}"));
var servicesDatabase = builder.AddConnectionString(
    "services-database",
    ReferenceExpression.Create(
        $"Host={postgresEndpoint.Property(EndpointProperty.Host)};" +
        $"Port={postgresEndpoint.Property(EndpointProperty.Port)};" +
        $"Database=appdb;Username=services_app;Password={servicesDbPassword}"));

var identityService = builder.AddProject<Projects.IdentityService_Api>("identity-service", launchProfileName: "http")
    .WithHttpEndpoint(port: 5081, name: "http")
    .WithReference(identityDatabase, connectionName: "Default")
    .WithEnvironment("IdentityClients__AssistantServiceWorker__Secret", workerSecret)
    .WithEnvironment("IdentityClients__TenantProvisioning__Secret", provisioningSecret)
    .WaitFor(appdb);

var servicesService = builder.AddProject<Projects.ServicesService_Api>("services-service", launchProfileName: "http")
    .WithHttpEndpoint(port: 5080, name: "http")
    .WithReference(servicesDatabase, connectionName: "Default")
    .WithReference(identityService)
    .WaitFor(identityService);

var assistantService = builder.AddUvicornApp(
        "assistant-service",
        "../../ai-services/assistant-service",
        "app.main:app")
    .WithUv(args: ["sync", "--frozen", "--extra", "dev"])
    .WithHttpEndpoint(port: 8001, env: "PORT")
    .WithReference(identityService)
    // IDENTITY_ISSUER needs the trailing slash to match OpenIddict's "iss" claim, or token validation fails with "Invalid issuer".
    .WithEnvironment("IDENTITY_AUTHORITY", identityService.GetEndpoint("http"))
    .WithEnvironment("IDENTITY_ISSUER", ReferenceExpression.Create($"{identityService.GetEndpoint("http")}/"))
    .WithEnvironment("IDENTITY_AUDIENCE", "services-api")
    .WithEnvironment("IDENTITY_CLIENT_ID", "assistant-service-worker")
    .WithEnvironment("IDENTITY_CLIENT_SECRET", workerSecret)
    .WithEnvironment("IDENTITY_SCOPE", "services-api")
    .WaitFor(identityService);

var frontend = builder.AddViteApp("admin-frontend", "../../apps/admin-frontend")
    .WithHttpEndpoint(port: 5173)
    .WithReference(servicesService)
    .WithReference(identityService)
    .WithEnvironment("VITE_API_BASE_URL", servicesService.GetEndpoint("http"))
    .WithEnvironment("VITE_OIDC_AUTHORITY", identityService.GetEndpoint("http"))
    .WithEnvironment("VITE_OIDC_CLIENT_ID", "admin-panel")
    .WithEnvironment("VITE_OIDC_REDIRECT_URI", "http://localhost:5173/callback")
    .WithEnvironment("VITE_OIDC_POST_LOGOUT_REDIRECT_URI", "http://localhost:5173/login")
    .WithEnvironment("VITE_OIDC_SCOPE", "openid profile tenant_id services-api offline_access")
    .WaitFor(servicesService);

builder.Build().Run();
