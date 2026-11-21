using Admin.Identity.Client;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using ModelContextProtocol.AspNetCore.Authentication;

namespace ServicesService.Mcp.Setup;

public static class AuthenticationExtensions
{
    public const string RequiredScope = "services-mcp";

    // Advertised in the 401 challenge and in the resource metadata. Clients request the challenge scope as
    // given, so offline_access has to be part of it or they never receive a refresh token.
    public const string ChallengeScope = RequiredScope + " offline_access";

    public static IServiceCollection AddMcpAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var resource = new Uri(configuration["Mcp:Resource"]
            ?? throw new InvalidOperationException("Missing 'Mcp:Resource' configuration."));
        var authority = configuration["Identity:Authority"]
            ?? throw new InvalidOperationException("Missing 'Identity:Authority' configuration.");

        services.AddIdentityServiceAuthentication(configuration, resource.AbsoluteUri);
        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = McpAuthenticationDefaults.AuthenticationScheme;
            options.DefaultForbidScheme = JwtBearerDefaults.AuthenticationScheme;
        }).AddMcp(options =>
        {
            options.ResourceMetadata = new()
            {
                Resource = resource.AbsoluteUri,
                ResourceName = "Agenza Serviços",
                AuthorizationServers = { authority },
                ScopesSupported = [RequiredScope, "offline_access"],
            };
        });

        return services;
    }
}
