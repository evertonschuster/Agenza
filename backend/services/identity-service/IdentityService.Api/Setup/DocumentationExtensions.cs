using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using Scalar.AspNetCore;

namespace IdentityService.Api.Setup;

public static class DocumentationExtensions
{
    private const string ApiDocsRoute = "/api-docs";
    private const string BearerSchemeName = "Bearer";
    private const string OAuthSchemeName = "OAuth";
    private const string ClientId = "admin-panel";
    private static readonly string[] OAuthScopes = ["openid", "profile", "email", "tenant_id", "services-api", "offline_access"];

    public static IServiceCollection AddApiDocumentation(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var publicIssuer = configuration["Identity:PublicIssuer"]
            ?? configuration["Identity:Authority"]
            ?? throw new InvalidOperationException("Missing 'Identity:PublicIssuer' configuration.");
        var identityBaseUrl = publicIssuer.TrimEnd('/');

        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Components ??= new OpenApiComponents();
                document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();

                document.Components.SecuritySchemes[BearerSchemeName] = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Cole um access token emitido pelo identity service.",
                };

                document.Components.SecuritySchemes[OAuthSchemeName] = new OpenApiSecurityScheme
                {
                    Type = SecuritySchemeType.OAuth2,
                    Flows = new OpenApiOAuthFlows
                    {
                        AuthorizationCode = new OpenApiOAuthFlow
                        {
                            AuthorizationUrl = new Uri($"{identityBaseUrl}/connect/authorize"),
                            TokenUrl = new Uri($"{identityBaseUrl}/connect/token"),
                            Scopes = new Dictionary<string, string>
                            {
                                ["openid"] = "OpenID Connect",
                                ["profile"] = "Perfil do usuário",
                                ["email"] = "Email do usuário",
                                ["tenant_id"] = "Tenant atual",
                                ["services-api"] = "Acesso à API de serviços",
                                ["offline_access"] = "Refresh token",
                            },
                        },
                    },
                };

                return Task.CompletedTask;
            });
        });

        return services;
    }

    public static WebApplication MapApiDocumentation(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment())
        {
            return app;
        }

        app.MapOpenApi().AllowAnonymous();
        app.MapScalarApiReference(ApiDocsRoute, options => options
            .AddPreferredSecuritySchemes(OAuthSchemeName, BearerSchemeName)
            .AddAuthorizationCodeFlow(OAuthSchemeName, flow =>
            {
                flow.ClientId = ClientId;
                flow.Pkce = Pkce.Sha256;
                flow.SelectedScopes = OAuthScopes;
            })
            .EnablePersistentAuthentication())
            .AllowAnonymous();

        return app;
    }
}
