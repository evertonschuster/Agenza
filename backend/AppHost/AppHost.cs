var builder = DistributedApplication.CreateBuilder(args);

var developmentPassword = builder.AddParameter(
    "development-password",
    "postgres",
    secret: true);

var postgres = builder.AddPostgres("postgres", password: developmentPassword)
    .WithHostPort(5432)
    .WithEnvironment("POSTGRES_DB", "appdb")
    .WithEnvironment("APP_DB_PASSWORD", developmentPassword)
    .WithInitFiles("../../infra/postgres/init")
    .WithDataVolume("agenza-postgres-data");
var appdb = postgres.AddDatabase("appdb", "appdb");

var postgresEndpoint = postgres.GetEndpoint("tcp");
var identityDatabase = builder.AddConnectionString(
    "identity-database",
    ReferenceExpression.Create(
        $"Host={postgresEndpoint.Property(EndpointProperty.Host)};" +
        $"Port={postgresEndpoint.Property(EndpointProperty.Port)};" +
        $"Database=appdb;Username=identity_app;Password={developmentPassword}"));
var servicesDatabase = builder.AddConnectionString(
    "services-database",
    ReferenceExpression.Create(
        $"Host={postgresEndpoint.Property(EndpointProperty.Host)};" +
        $"Port={postgresEndpoint.Property(EndpointProperty.Port)};" +
        $"Database=appdb;Username=services_app;Password={developmentPassword}"));

var identityService = builder.AddProject<Projects.IdentityService_Api>("identity-service", launchProfileName: "http")
    .WithHttpEndpoint(port: 5081, name: "http")
    .WithReference(identityDatabase, connectionName: "Default")
    .WithEnvironment("IdentityClients__AssistantServiceWorker__Secret", developmentPassword)
    .WithEnvironment("IdentityClients__TenantProvisioning__Secret", developmentPassword)
    .WaitFor(appdb);

var servicesService = builder.AddProject<Projects.ServicesService_Api>("services-service", launchProfileName: "http")
    .WithHttpEndpoint(port: 5080, name: "http")
    .WithReference(servicesDatabase, connectionName: "Default")
    .WithReference(identityService)
    .WaitFor(identityService);

builder.AddUvicornApp(
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
    .WithEnvironment("IDENTITY_CLIENT_SECRET", developmentPassword)
    .WithEnvironment("IDENTITY_SCOPE", "services-api")
    .WaitFor(identityService);

builder.AddViteApp("admin-frontend", "../../apps/admin-frontend")
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

await builder.Build().RunAsync();
