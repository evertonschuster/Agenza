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

        // Schema-per-service on a shared Postgres instance.
        builder.HasDefaultSchema("identity");

        builder.ApplyConfigurationsFromAssembly(typeof(IdentityDataContext).Assembly);

        builder.UseOpenIddict<Guid>();

        // Soft-delete query filter + DeletedAt index for every BaseEntity
        // (docs/adr/0006) - a new entity gets both for free just by
        // inheriting BaseEntity, no per-configuration boilerplate.
        builder.ApplyAuditableConventions(this, typeof(BaseEntity));
    }
}
