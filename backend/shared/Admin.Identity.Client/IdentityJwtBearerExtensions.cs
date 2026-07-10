using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.Identity.Client;

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
