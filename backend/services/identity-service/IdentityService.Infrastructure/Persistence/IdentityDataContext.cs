using Admin.SharedKernel.EntityFrameworkCore;
using IdentityService.Domain.Common;
using IdentityService.Domain.Entities;
using IdentityService.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace IdentityService.Infrastructure.Persistence;

public class IdentityDataContext : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>
{
    public IdentityDataContext(DbContextOptions<IdentityDataContext> options)
        : base(options)
    {
    }

    public DbSet<Tenant> Tenants => Set<Tenant>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // This service shares one Postgres instance/database with every
        // other microservice (infra/docker-compose.yml) - each service
        // owns its own schema instead of its own database, so its tables
        // never collide with another service's.
        builder.HasDefaultSchema("identity");

        builder.ApplyConfigurationsFromAssembly(typeof(IdentityDataContext).Assembly);

        // Registers the entity sets OpenIddict needs (applications,
        // authorizations, scopes, tokens) using Guid keys, consistent with
        // ApplicationUser's key type.
        builder.UseOpenIddict<Guid>();

        // Soft-delete query filter + DeletedAt index for every BaseEntity
        // (docs/adr/0006) - a new entity gets both for free just by
        // inheriting BaseEntity, no per-configuration boilerplate.
        builder.ApplyAuditableConventions(typeof(BaseEntity));
    }
}
