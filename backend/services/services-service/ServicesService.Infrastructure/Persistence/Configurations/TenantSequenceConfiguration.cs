using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Persistence.Configurations;

public class TenantSequenceConfiguration : IEntityTypeConfiguration<TenantSequence>
{
    public void Configure(EntityTypeBuilder<TenantSequence> builder)
    {
        builder.ToTable("TenantSequences");
        builder.HasKey(t => new { t.TenantId, t.EntityName });

        builder.Property(t => t.EntityName).IsRequired().HasMaxLength(100);
        builder.Property(t => t.LastValue).IsRequired();
    }
}
