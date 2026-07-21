using Admin.SharedKernel;
using Asp.Versioning;
using IdentityService.Api.Seed;
using IdentityService.Application;
using IdentityService.Infrastructure;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;
using OpenIddict.Validation.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

builder.Services.AddControllers();
builder.Services.AddRazorPages();
builder.Services.AddOpenApi();

builder.Services.AddExceptionHandler<GenericExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services
    .AddApiVersioning(options =>
    {
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.AssumeDefaultVersionWhenUnspecified = true;
        options.ReportApiVersions = true;
    })
    .AddMvc();

builder.Services.AddIdentityInfrastructure(builder.Configuration);
builder.Services.AddSharedKernel();
builder.Services.AddIdentityApplication();
builder.Services.AddHostedService<DatabaseSeeder>();

var publicIssuer = builder.Configuration["Identity:PublicIssuer"];

var spaOrigin = builder.Configuration["Cors:SpaOrigin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("spa", policy => policy
        .WithOrigins(spaOrigin)
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
            "services-api",
            "identity-admin");

        if (builder.Environment.IsDevelopment())
        {
            // Dev-only: production must configure real signing/encryption certs, or OpenIddict intentionally fails startup validation.
            options.AddDevelopmentEncryptionCertificate()
                   .AddDevelopmentSigningCertificate();
        }

        // Resource servers verify the JWT themselves, so it can't use OpenIddict's default encrypted token format.
        options.DisableAccessTokenEncryption();

        // Without a fixed issuer, OpenIddict infers "iss" per-request, which breaks validation across the docker network
        // (SPA reaches this via localhost:5081, other containers via identity-service:8080 - two different "iss" values).
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
            // Dev-only: production must terminate TLS in front of this service and drop this line.
            aspNetCoreBuilder.DisableTransportSecurityRequirement();
        }
    })
    .AddValidation(options =>
    {
        options.UseLocalServer();
        options.UseAspNetCore();
    });

var app = builder.Build();

app.UseExceptionHandler();

if (string.IsNullOrEmpty(publicIssuer) && !app.Environment.IsDevelopment())
{
    app.Logger.LogWarning(
        "'Identity:PublicIssuer' is not configured outside Development - " +
        "the issuer will be inferred per-request, which breaks token " +
        "validation for callers reaching this service via a different " +
        "host/port than the one that issued the token.");
}

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
app.MapDefaultEndpoints();

app.Run();

// Exposes Program to WebApplicationFactory<Program> in IdentityService.IntegrationTests.
public partial class Program;
