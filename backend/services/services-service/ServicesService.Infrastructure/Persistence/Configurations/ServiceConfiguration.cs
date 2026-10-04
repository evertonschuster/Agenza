using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Infrastructure.Persistence.Configurations;

public class ServiceConfiguration : IEntityTypeConfiguration<Service>
{
    public void Configure(EntityTypeBuilder<Service> builder)
    {
        builder.ToTable("Services");
        builder.HasKey(s => s.Id);
        builder.HasAlternateKey(s => new { s.TenantId, s.Id });

        builder.Property(s => s.TenantId).IsRequired();
        builder.Property(s => s.Code).IsRequired();
        builder.Property(s => s.Name).IsRequired().HasMaxLength(Service.NameMaxLength);
        builder.Property(s => s.Description).HasMaxLength(Service.DescriptionMaxLength);
        builder.Property(s => s.DurationMinutes).IsRequired();
        builder.Property(s => s.MinDurationMinutes).IsRequired();
        builder.Property(s => s.MaxDurationMinutes).IsRequired();
        builder.Property(s => s.Price)
            .HasConversion(price => price.Value, value => Money.Restore(value))
            .IsRequired()
            .HasPrecision(Money.Precision, Money.Scale);
        builder.Property(s => s.MaxDiscountPercentage)
            .HasConversion(percentage => percentage.Value, value => Percentage.Restore(value))
            .IsRequired()
            .HasPrecision(Percentage.Precision, Percentage.Scale);
        builder.Property(s => s.CategoryId);
        builder.HasOne<Category>()
            .WithMany()
            .HasForeignKey(s => new { s.TenantId, s.CategoryId })
            .HasPrincipalKey(c => new { c.TenantId, c.Id })
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property<string>("NameNormalized").HasComputedColumnSql("lower(\"Name\")", stored: true);
        builder.HasIndex("TenantId", "NameNormalized")
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");

        builder.HasIndex(s => new { s.TenantId, s.Code })
            .IsUnique()
            .HasFilter("\"DeletedAt\" IS NULL");

        builder.HasMany(s => s.Tags)
            .WithOne()
            .HasForeignKey(t => new { t.TenantId, t.ServiceId })
            .HasPrincipalKey(s => new { s.TenantId, s.Id })
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(s => s.Tags).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
