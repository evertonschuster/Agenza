using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServicesService.Domain.Entities;

namespace ServicesService.Infrastructure.Persistence.Configurations;

public class CategoryConfiguration : IEntityTypeConfiguration<Category>
{
    public void Configure(EntityTypeBuilder<Category> builder)
    {
        builder.ToTable("Categories");
        builder.HasKey(c => c.Id);

        builder.Property(c => c.TenantId).IsRequired();
        builder.Property(c => c.Name).IsRequired().HasMaxLength(Category.NameMaxLength);

        // Case-insensitive uniqueness enforced by the database itself (docs/adr/0012),
        // not just the application-level NameExistsAsync pre-check: a generated,
        // always-lowercase shadow column backs the unique index so two concurrent
        // requests can't both persist "Massagem"/"massagem". Filtered to non-deleted
        // rows so a soft-deleted category doesn't block reusing its name.
        builder.Property<string>("NameNormalized").HasComputedColumnSql("lower(\"Name\")", stored: true);
        builder.HasIndex("TenantId", "NameNormalized")
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");
    }
}
