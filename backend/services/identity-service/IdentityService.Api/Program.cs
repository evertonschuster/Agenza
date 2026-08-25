using Admin.SharedKernel;
using Admin.SharedKernel.AspNetCore;
using Asp.Versioning;
using IdentityService.Api.Seed;
using IdentityService.Api.Setup;
using IdentityService.Application;
using IdentityService.Infrastructure;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;
using OpenIddict.Validation.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

var publicIssuer = builder.Configuration["Identity:PublicIssuer"]
    ?? builder.Configuration["Identity:Authority"]
    ?? throw new InvalidOperationException("Missing 'Identity:PublicIssuer' configuration.");

builder.Services.AddControllers();
builder.Services.AddRazorPages();
builder.Services.AddApiDocumentation(builder.Configuration);

builder.Services.AddExceptionHandler<GenericExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddAuthorizationProblemDetails();

builder.Services
    .AddApiVersioning(options =>
    {
        options.ApiVersionReader = new UrlSegmentApiVersionReader();
        options.DefaultApiVersion = new ApiVersion(1, 0);
        options.ReportApiVersions = true;
    })
    .AddMvc();

builder.Services.AddIdentityInfrastructure(builder.Configuration);
builder.Services.AddSharedKernel();
builder.Services.AddIdentityApplication();
builder.Services.AddHostedService<DatabaseSeeder>();

builder.Services.AddIdentityCors(builder.Configuration);

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

        // Without a fixed issuer, OpenIddict infers "iss" per request, which breaks validation when callers use different service-discovery addresses.
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
    app.MapApiDocumentation();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseCors("spa");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapRazorPages();
app.MapDefaultEndpoints();

await app.RunAsync();
