using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServicesService.Domain.Entities;

namespace ServicesService.Infrastructure.Persistence.Configurations;

public class ServiceOfferingConfiguration : IEntityTypeConfiguration<ServiceOffering>
{
    public void Configure(EntityTypeBuilder<ServiceOffering> builder)
    {
        builder.ToTable("ServiceOfferings");
        builder.HasKey(s => s.Id);

        builder.Property(s => s.TenantId).IsRequired();
        builder.Property(s => s.Name).IsRequired().HasMaxLength(ServiceOffering.NameMaxLength);
        builder.Property(s => s.Description).HasMaxLength(ServiceOffering.DescriptionMaxLength);
        builder.Property(s => s.DurationMinutes).IsRequired();
        builder.Property(s => s.Price).IsRequired().HasPrecision(10, 2);

        // Same pattern as TagConfiguration: tenant id leads the index, the
        // case-insensitive uniqueness rule itself is enforced by the use
        // cases via IServiceOfferingRepository.NameExistsAsync, and the
        // filter excludes soft-deleted rows so their name can be reused.
        builder.HasIndex(s => new { s.TenantId, s.Name })
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");
    }
}
