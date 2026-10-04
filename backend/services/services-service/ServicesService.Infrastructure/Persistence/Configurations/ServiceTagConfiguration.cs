using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServicesService.Domain.Entities;

namespace ServicesService.Infrastructure.Persistence.Configurations;

public class ServiceTagConfiguration : IEntityTypeConfiguration<ServiceTag>
{
    public void Configure(EntityTypeBuilder<ServiceTag> builder)
    {
        builder.ToTable("ServiceTags");
        builder.HasKey(t => t.Id);
        // The root mints the id; otherwise EF reads a link added to a tracked service as an existing row and updates it.
        builder.Property(t => t.Id).ValueGeneratedNever();

        builder.Property(t => t.TenantId).IsRequired();
        builder.Property(t => t.ServiceId).IsRequired();
        builder.Property(t => t.TagId).IsRequired();

        builder.HasOne<Tag>()
            .WithMany()
            .HasForeignKey(t => new { t.TenantId, t.TagId })
            .HasPrincipalKey(tag => new { tag.TenantId, tag.Id })
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(t => new { t.TenantId, t.ServiceId, t.TagId })
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");
    }
}
