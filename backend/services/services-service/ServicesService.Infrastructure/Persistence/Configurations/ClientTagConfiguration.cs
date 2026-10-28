using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ServicesService.Infrastructure.Persistence.Configurations;

public class ClientTagConfiguration : IEntityTypeConfiguration<ClientTag>
{
    public void Configure(EntityTypeBuilder<ClientTag> builder)
    {
        builder.ToTable("ClientTags");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Id).ValueGeneratedNever();

        builder.Property(t => t.TenantId).IsRequired();
        builder.Property(t => t.ClientId).IsRequired();
        builder.Property(t => t.TagId).IsRequired();

        builder.HasOne<Tag>()
            .WithMany()
            .HasForeignKey(t => new { t.TenantId, t.TagId })
            .HasPrincipalKey(tag => new { tag.TenantId, tag.Id })
            .OnDelete(DeleteBehavior.Restrict);

        // Filtered to live links so a tag removed from a client can be linked to it again (docs/adr/0088).
        builder.HasIndex(t => new { t.TenantId, t.ClientId, t.TagId })
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");
        builder.HasIndex(t => new { t.TenantId, t.TagId });
    }
}
