using Microsoft.EntityFrameworkCore;
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
    }
}
