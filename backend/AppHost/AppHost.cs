var builder = DistributedApplication.CreateBuilder(args);

// AddDatabase's first arg ("Default") is the ConnectionStrings__ env var key both services read - not the database name (that's "appdb").
var postgres = builder.AddPostgres("postgres")
    .WithDataVolume();
var appdb = postgres.AddDatabase("Default", "appdb");

var identityService = builder.AddProject<Projects.IdentityService_Api>("identity-service", launchProfileName: "http")
    .WithHttpEndpoint(port: 5081, name: "http")
    .WithReference(appdb)
    .WaitFor(appdb);

var servicesService = builder.AddProject<Projects.ServicesService_Api>("services-service", launchProfileName: "http")
    .WithHttpEndpoint(port: 5080, name: "http")
    .WithReference(appdb)
    .WithReference(identityService)
    .WaitFor(identityService);

var workerSecret = builder.AddParameter("assistant-worker-secret", secret: true);

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
