namespace ServicesService.Mcp.Setup;

public static class CorsExtensions
{
    public const string PolicyName = "mcp-clients";

    // Browser-hosted MCP clients (vscode.dev) call the resource from the page, so they need CORS.
    // Origins are explicit configuration; without any, no cross-origin access is granted.
    public static IServiceCollection AddMcpCors(this IServiceCollection services, IConfiguration configuration)
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];

        services.AddCors(options => options.AddPolicy(PolicyName, policy =>
        {
            if (origins.Length == 0)
            {
                return;
            }

            policy.WithOrigins(origins)
                .AllowAnyHeader()
                .WithMethods("GET", "POST", "DELETE", "OPTIONS")
                .WithExposedHeaders("WWW-Authenticate", "Mcp-Session-Id", "Mcp-Protocol-Version");
        }));

        return services;
    }
}
