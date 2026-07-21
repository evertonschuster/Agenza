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

        // Case-insensitive uniqueness enforced by the database itself (docs/adr/0012),
        // not just the application-level NameExistsAsync pre-check: a generated,
        // always-lowercase shadow column backs the unique index so two concurrent
        // requests can't both persist "VIP"/"vip". Filtered to non-deleted rows so a
        // soft-deleted tag doesn't block reusing its name.
        builder.Property<string>("NameNormalized").HasComputedColumnSql("lower(\"Name\")", stored: true);
        builder.HasIndex("TenantId", "NameNormalized")
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");
    }
}
