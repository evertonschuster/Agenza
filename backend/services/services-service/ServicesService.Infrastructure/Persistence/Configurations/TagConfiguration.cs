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

        builder.Property(t => t.Color)
            .HasConversion(color => color.Value, value => TagColor.From(value))
            .IsRequired()
            .HasMaxLength(7);

        // Exact-match backstop; case-insensitive uniqueness is enforced in ITagRepository.NameExistsAsync before any write.
        // Filtered to non-deleted rows so a soft-deleted tag doesn't block reusing its name.
        builder.HasIndex(t => new { t.TenantId, t.Name })
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");
    }
}
