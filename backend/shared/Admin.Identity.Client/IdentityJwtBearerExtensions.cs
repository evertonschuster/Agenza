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
        services.AddHttpClient(
            IdentityAuthorityHealthCheck.HttpClientName,
            client => client.BaseAddress = new Uri($"{authority.TrimEnd('/')}/"));
        services.AddHealthChecks()
            .AddCheck<IdentityAuthorityHealthCheck>(
                "identity-service",
                tags: ["ready"]);

        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.Authority = authority;
                options.Audience = audience;
                options.RequireHttpsMetadata = configuration.GetValue("Identity:RequireHttpsMetadata", true);
                // The accessors read "sub" and "tenant_id" as the token names them; the default map renames "sub".
                options.MapInboundClaims = false;
            });

        services.AddAuthorization();

        return services;
    }
}
