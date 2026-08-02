namespace IdentityService.Api.Setup;

public static class CorsExtensions
{
    public static IServiceCollection AddIdentityCors(this IServiceCollection services, IConfiguration configuration)
    {
        var origins = configuration.GetSection("Cors:AllowedOrigins")
            .GetChildren()
            .Select(child => child.Value)
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value!)
            .ToArray();

        if (origins.Length == 0)
        {
            var spaOrigin = configuration["Cors:SpaOrigin"] ?? "http://localhost:5173";
            origins = [spaOrigin];
        }

        services.AddCors(options =>
        {
            options.AddPolicy("spa", policy => policy
                .WithOrigins(origins)
                .AllowAnyHeader()
                .AllowAnyMethod());
        });

        return services;
    }
}
