using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;

namespace ServicesService.Infrastructure.Persistence;

public class ServicesDataContext : DbContext
{
    public ServicesDataContext(DbContextOptions<ServicesDataContext> options)
        : base(options)
    {
    }

    public DbSet<Tag> Tags => Set<Tag>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Shared Postgres instance, one schema per service (ADR 0002) -
        // this service's tables live under "services" and never collide
        // with identity-service's "identity" schema.
        builder.HasDefaultSchema("services");

        builder.ApplyConfigurationsFromAssembly(typeof(ServicesDataContext).Assembly);

        // Soft-delete query filter + DeletedAt index for every BaseEntity
        // (docs/adr/0006) - a new entity gets both for free just by
        // inheriting BaseEntity, no per-configuration boilerplate.
        builder.ApplyAuditableConventions(typeof(BaseEntity));
    }
}
