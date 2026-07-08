var builder = DistributedApplication.CreateBuilder(args);

// AddDatabase(name, databaseName): "name" becomes both the Aspire resource
// name AND the injected ConnectionStrings__<name> env var key, while
// databaseName is the actual database created inside Postgres. "Default"
// here (not "appdb") is what makes configuration.GetConnectionString("Default")
// keep working unchanged in both .NET services.
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
    // Mirrors infra/docker-compose.yml's assistant-service env vars.
    // IDENTITY_ISSUER needs the trailing slash to exactly match the "iss"
    // claim OpenIddict stamps on tokens (Identity:PublicIssuer) - the
    // Python config's own fallback (authority without a slash) doesn't
    // match it, which fails token validation with "Invalid issuer".
    .WithEnvironment("IDENTITY_AUTHORITY", "http://localhost:5081")
    .WithEnvironment("IDENTITY_ISSUER", "http://localhost:5081/")
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
