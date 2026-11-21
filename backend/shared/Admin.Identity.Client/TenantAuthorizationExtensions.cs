using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.DependencyInjection;

namespace Admin.Identity.Client;

public static class TenantAuthorizationExtensions
{
    public const string PolicyName = "Tenant";

    public static IServiceCollection AddTenantAuthorization(this IServiceCollection services)
    {
        services.AddAuthorization(options =>
        {
            var policy = new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .RequireAssertion(context => TryGetTenantId(context.User, out _))
                .Build();

            options.AddPolicy(PolicyName, policy);
            options.DefaultPolicy = policy;
            options.FallbackPolicy = policy;
        });

        return services;
    }

    internal static bool TryGetTenantId(ClaimsPrincipal? principal, out Guid tenantId)
    {
        return Guid.TryParse(principal?.FindFirst("tenant_id")?.Value, out tenantId)
            && tenantId != Guid.Empty;
    }
}
