using Admin.Identity.Client;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using ModelContextProtocol.AspNetCore.Authentication;

namespace ServicesService.Mcp.Setup;

public static class AuthenticationExtensions
{
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
                ResourceName = "Agenza MCP",
                AuthorizationServers = { authority },
                ScopesSupported = ["mcp:connect", "offline_access"],
            };
        });

        services.AddAuthorization(options => options.AddPolicy("McpUser", policy => policy
            .RequireAuthenticatedUser()
            .RequireAssertion(context =>
                Guid.TryParse(context.User.FindFirst("sub")?.Value, out var userId)
                && userId != Guid.Empty
                && Guid.TryParse(context.User.FindFirst("tenant_id")?.Value, out var tenantId)
                && tenantId != Guid.Empty
                && context.User.FindAll("scope")
                    .SelectMany(claim => claim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                    .Contains("mcp:connect", StringComparer.Ordinal)
                && (context.Resource is not HttpContext httpContext
                    || !httpContext.Request.Headers.TryGetValue("X-Tenant-Id", out var header)
                    || (header.Count == 1
                        && Guid.TryParse(header[0], out var routedTenant)
                        && routedTenant == tenantId)))));

        return services;
    }
}
