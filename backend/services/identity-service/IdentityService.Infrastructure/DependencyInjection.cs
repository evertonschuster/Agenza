using IdentityService.Application.Abstractions;
using IdentityService.Infrastructure.Identity;
using IdentityService.Infrastructure.Persistence;
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

        services.AddDbContext<IdentityDataContext>(options => options.UseNpgsql(connectionString));

        services
            .AddIdentity<ApplicationUser, IdentityRole<Guid>>(options =>
            {
                options.Password.RequireNonAlphanumeric = false;
                options.User.RequireUniqueEmail = true;

                // OpenIddict reads the short "sub"/"name"/"role" claim
                // types (via ClaimsPrincipal.GetClaim/SetClaim), while
                // ASP.NET Core Identity's defaults use the long
                // ClaimTypes.* URIs. Without this remap,
                // SignInManager.CreateUserPrincipalAsync() produces a
                // principal OpenIddict rejects for having no "sub" claim.
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

        // Wires the OpenIddict Core services to the same DbContext/Guid
        // keys used above. Server/Validation (HTTP endpoints, flows,
        // signing) are configured in Api/Program.cs.
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
