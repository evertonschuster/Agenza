using Admin.Identity.Client;
using IdentityService.Application.Abstractions;
using IdentityService.Infrastructure.Identity;
using IdentityService.Infrastructure.Persistence;
using IdentityService.Infrastructure.Persistence.Interceptors;
using IdentityService.Infrastructure.Repositories;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using OpenIddict.Abstractions;

namespace IdentityService.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddIdentityInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Default")
            ?? throw new InvalidOperationException("Missing 'ConnectionStrings:Default' configuration.");

        // Unlike services-service, this service is the identity provider
        // itself (cookie/OpenIddict auth, not AddIdentityServiceAuthentication's
        // JwtBearer wiring) - it must register ICurrentUserAccessor itself
        // for the audit interceptor below to resolve.
        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentUserAccessor, HttpContextCurrentUserAccessor>();

        services.AddSingleton(TimeProvider.System);
        services.AddScoped<AuditableEntitySaveChangesInterceptor>();

        services.AddDbContext<IdentityDataContext>((serviceProvider, options) =>
            options
                .UseNpgsql(connectionString)
                .AddInterceptors(serviceProvider.GetRequiredService<AuditableEntitySaveChangesInterceptor>()));

        services
            .AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
            {
                options.Password.RequireNonAlphanumeric = false;
                options.User.RequireUniqueEmail = true;

                // Without this remap to OpenIddict's short claim types, CreateUserPrincipalAsync() produces a principal OpenIddict rejects (no "sub" claim).
                options.ClaimsIdentity.UserIdClaimType = OpenIddictConstants.Claims.Subject;
                options.ClaimsIdentity.UserNameClaimType = OpenIddictConstants.Claims.Name;
                options.ClaimsIdentity.RoleClaimType = OpenIddictConstants.Claims.Role;
                options.ClaimsIdentity.EmailClaimType = OpenIddictConstants.Claims.Email;
            })
            .AddEntityFrameworkStores<IdentityDataContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<IUserClaimsPrincipalFactory<ApplicationUser>, TenantClaimsPrincipalFactory>();

        services.AddScoped<ITenantRepository, TenantRepository>();
        services.AddScoped<IUserAccountService, UserAccountService>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Server/Validation (HTTP endpoints, flows, signing) are configured in Api/Program.cs.
        services.AddOpenIddict()
            .AddCore(options =>
            {
                options.UseEntityFrameworkCore()
                    .UseDbContext<IdentityDataContext>()
                    .ReplaceDefaultEntities<Guid>();
            });

        return services;
    }
}
