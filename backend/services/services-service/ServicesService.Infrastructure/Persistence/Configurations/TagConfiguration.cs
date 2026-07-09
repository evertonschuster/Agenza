using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Infrastructure.Persistence.Configurations;

public class TagConfiguration : IEntityTypeConfiguration<Tag>
{
    public void Configure(EntityTypeBuilder<Tag> builder)
    {
        builder.ToTable("Tags");
        builder.HasKey(t => t.Id);

        builder.Property(t => t.TenantId).IsRequired();
        builder.Property(t => t.Name).IsRequired().HasMaxLength(Tag.NameMaxLength);
        builder.Property(t => t.Description).HasMaxLength(Tag.DescriptionMaxLength);

        // TagColor persists as its normalized hex string ("#0d9488").
        builder.Property(t => t.Color)
            .HasConversion(color => color.Value, value => TagColor.From(value))
            .IsRequired()
            .HasMaxLength(7);

        // Every query is tenant-scoped, so the tenant id leads the index.
        // Uniqueness here is the exact-match backstop; the case-insensitive
        // rule ("VIP" vs "vip") is enforced by the use cases via
        // ITagRepository.NameExistsAsync before any write.
        builder.HasIndex(t => new { t.TenantId, t.Name }).IsUnique();
    }
}
