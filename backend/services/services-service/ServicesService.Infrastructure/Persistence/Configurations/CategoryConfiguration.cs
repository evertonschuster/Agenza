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

        // Exact-match backstop; case-insensitive uniqueness is enforced in ICategoryRepository.NameExistsAsync before any write.
        // Filtered to non-deleted rows so a soft-deleted category doesn't block reusing its name.
        builder.HasIndex(c => new { c.TenantId, c.Name })
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");
    }
}
