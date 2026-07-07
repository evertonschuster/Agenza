using IdentityService.Api.Seed;
using IdentityService.Application.UseCases.ProvisionTenant;
using IdentityService.Infrastructure;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;
using OpenIddict.Validation.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddRazorPages();
builder.Services.AddOpenApi();

builder.Services.AddIdentityInfrastructure(builder.Configuration);
builder.Services.AddScoped<ProvisionTenantUseCase>();
builder.Services.AddHostedService<DatabaseSeeder>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy => policy
        .WithOrigins("http://localhost:5173")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddOpenIddict()
    .AddServer(options =>
    {
        options.SetAuthorizationEndpointUris("connect/authorize")
               .SetTokenEndpointUris("connect/token")
               .SetUserInfoEndpointUris("connect/userinfo")
               .SetEndSessionEndpointUris("connect/logout");

        options.AllowAuthorizationCodeFlow()
               .RequireProofKeyForCodeExchange()
               .AllowRefreshTokenFlow()
               .AllowClientCredentialsFlow();

        options.RegisterScopes(
            OpenIddictConstants.Scopes.OpenId,
            OpenIddictConstants.Scopes.Profile,
            OpenIddictConstants.Scopes.Email,
            OpenIddictConstants.Scopes.OfflineAccess,
            "tenant_id",
            "services-api");

        options.AddDevelopmentEncryptionCertificate()
               .AddDevelopmentSigningCertificate();

        // Resource servers (services-service's plain JwtBearer middleware,
        // assistant-service's PyJWT/JWKS validation) need a standard signed
        // JWT they can verify themselves - not OpenIddict's default
        // encrypted token format, which only OpenIddict's own validation
        // handler can decrypt.
        options.DisableAccessTokenEncryption();

        // Without a fixed issuer, OpenIddict infers "iss" from whichever
        // host/port the current request came in on. That breaks token
        // validation across the docker network: the SPA reaches this
        // service via localhost:5081, while other containers reach it via
        // identity-service:8080 - two different "iss" values for tokens
        // that must validate the same way everywhere. Pinning it to the
        // externally-reachable URL keeps it consistent for every caller.
        var publicIssuer = builder.Configuration["Identity:PublicIssuer"];
        if (!string.IsNullOrEmpty(publicIssuer))
        {
            options.SetIssuer(new Uri(publicIssuer));
        }

        var aspNetCoreBuilder = options.UseAspNetCore()
               .EnableAuthorizationEndpointPassthrough()
               .EnableTokenEndpointPassthrough()
               .EnableUserInfoEndpointPassthrough()
               .EnableEndSessionEndpointPassthrough();

        if (builder.Environment.IsDevelopment())
        {
            // Dev-only: the discovery/token endpoints are served over plain
            // HTTP locally (docker-compose maps 5081 -> container 8080).
            // Production must terminate TLS in front of this service and
            // drop this line.
            aspNetCoreBuilder.DisableTransportSecurityRequirement();
        }
    })
    .AddValidation(options =>
    {
        options.UseLocalServer();
        options.UseAspNetCore();
    });

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("spa");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapRazorPages();

app.Run();
