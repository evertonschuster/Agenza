using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;

namespace ServicesService.Infrastructure.Persistence;

public class ServicesDataContext : DbContext
{
    private readonly Guid? _currentTenantId;

    public ServicesDataContext(DbContextOptions<ServicesDataContext> options, ICurrentTenantProvider? currentTenantProvider = null)
        : base(options)
    {
        _currentTenantId = currentTenantProvider is not null && currentTenantProvider.TryGetTenantId(out var tenantId)
            ? tenantId
            : null;
    }

    public Guid CurrentTenantId => _currentTenantId ?? Guid.Empty;

    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<ServiceOffering> ServiceOfferings => Set<ServiceOffering>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.HasDefaultSchema("services");

        builder.ApplyConfigurationsFromAssembly(typeof(ServicesDataContext).Assembly);
        builder.ApplyAuditableConventions(this, typeof(BaseEntity), typeof(ITenantOwned));
    }
}
