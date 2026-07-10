using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.Identity.Client;

/// <summary>
/// Standard JWT-bearer + tenant-claim wiring every resource microservice
/// needs to validate tokens issued by identity-service. Kept as a shared
/// library (not copy-pasted per service) because this is security-critical
/// cross-cutting infrastructure, not business logic - every service copied
/// from the reference layout should reference this instead of
/// reimplementing token validation.
/// </summary>
public static class IdentityJwtBearerExtensions
{
    public static IServiceCollection AddIdentityServiceAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        string audience)
    {
        var authority = configuration["Identity:Authority"]
            ?? throw new InvalidOperationException("Missing 'Identity:Authority' configuration.");

        services.AddHttpContextAccessor();
        services.AddScoped<ITenantAccessor, HttpContextTenantAccessor>();
        services.AddScoped<ICurrentUserAccessor, HttpContextCurrentUserAccessor>();
        services.AddScoped<TenantHeaderFilter>();

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authority;
                options.Audience = audience;
                options.RequireHttpsMetadata = configuration.GetValue("Identity:RequireHttpsMetadata", true);
            });

        services.AddAuthorization();

        return services;
    }
}
