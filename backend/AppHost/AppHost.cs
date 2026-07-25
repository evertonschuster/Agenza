var builder = DistributedApplication.CreateBuilder(args);

var identityDbPassword = builder.AddParameter("identity-db-password", secret: true);
var servicesDbPassword = builder.AddParameter("services-db-password", secret: true);
var workerSecret = builder.AddParameter("assistant-worker-secret", secret: true);
var provisioningSecret = builder.AddParameter("tenant-provisioning-secret", secret: true);

var postgres = builder.AddPostgres("postgres")
    .WithEnvironment("IDENTITY_DB_PASSWORD", identityDbPassword)
    .WithEnvironment("SERVICES_DB_PASSWORD", servicesDbPassword)
    .WithInitFiles("../../infra/postgres/init")
    .WithDataVolume();
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
    .WaitFor(servicesService);

builder.Build().Run();
