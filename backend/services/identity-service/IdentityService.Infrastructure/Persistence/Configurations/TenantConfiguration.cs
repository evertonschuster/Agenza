using IdentityService.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace IdentityService.Infrastructure.Persistence.Configurations;

public class TenantConfiguration : IEntityTypeConfiguration<Tenant>
{
    public void Configure(EntityTypeBuilder<Tenant> builder)
    {
        builder.ToTable("Tenants");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Name).IsRequired().HasMaxLength(200);

        // Filtered to non-deleted rows - see TagConfiguration for why.
        builder.HasIndex(t => t.Name).IsUnique().HasFilter("\"DeletedAt\" IS NULL");

        builder.HasQueryFilter(t => t.DeletedAt == null);
    }
}
