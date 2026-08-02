using Admin.Identity.Client;
using Microsoft.AspNetCore.OpenApi;
using Microsoft.OpenApi;
using Scalar.AspNetCore;
using System.Text.Json.Nodes;

namespace ServicesService.Api.Setup;

public static class DocumentationExtensions
{
    private const string ApiDocsRoute = "/api-docs";
    private const string OAuthSchemeName = "OAuth";
    private const string ClientId = "admin-panel";
    private static readonly string[] OAuthScopes = ["openid", "profile", "tenant_id", "services-api", "offline_access"];

    public static IServiceCollection AddApiDocumentation(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var identityAuthority = configuration["Identity:Authority"]
            ?? throw new InvalidOperationException("Missing 'Identity:Authority' configuration.");
        var identityBaseUrl = identityAuthority.TrimEnd('/');

        services.AddOpenApi(options =>
        {
            options.AddDocumentTransformer((document, _, _) =>
            {
                document.Components ??= new OpenApiComponents();
                document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();

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
                                ["tenant_id"] = "Tenant atual",
                                ["services-api"] = "Acesso à API de serviços",
                                ["offline_access"] = "Refresh token",
                            },
                        },
                    },
                };

                foreach (var operationParameters in document.Paths.Values
                    .SelectMany(pathItem => pathItem.Operations?.Values ?? Enumerable.Empty<OpenApiOperation>())
                    .Select(operation => operation.Parameters))
                {
                    if (operationParameters is null)
                    {
                        continue;
                    }

                    var hasTenantHeader = false;

                    for (var i = 0; i < operationParameters.Count; i++)
                    {
                        var parameter = operationParameters[i];

                        if (string.Equals(parameter.Name, "version", StringComparison.OrdinalIgnoreCase))
                        {
                            operationParameters[i] = new OpenApiParameter
                            {
                                Name = parameter.Name,
                                In = parameter.In,
                                Description = parameter.Description,
                                Required = parameter.Required,
                                Schema = new OpenApiSchema
                                {
                                    Type = JsonSchemaType.String,
                                    Default = JsonValue.Create("1.0"),
                                },
                            };
                        }

                        if (parameter.In == ParameterLocation.Header
                            && string.Equals(parameter.Name, TenantHeaderFilter.HeaderName, StringComparison.OrdinalIgnoreCase))
                        {
                            hasTenantHeader = true;
                        }
                    }

                    if (!hasTenantHeader)
                    {
                        operationParameters.Add(new OpenApiParameter
                        {
                            Name = TenantHeaderFilter.HeaderName,
                            In = ParameterLocation.Header,
                            Description = "Tenant ativo usado pelas requisições da documentação.",
                            Required = true,
                            Schema = new OpenApiSchema
                            {
                                Type = JsonSchemaType.String,
                                Default = JsonValue.Create("019f9b0b-e7fb-7ac6-84b7-5c8ed52c6120"),
                            },
                        });
                    }
                }

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
            .AddPreferredSecuritySchemes(OAuthSchemeName)
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
