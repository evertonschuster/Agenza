using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ServicesService.Infrastructure.Persistence.Configurations;

public class ClientGuardianConfiguration : IEntityTypeConfiguration<ClientGuardian>
{
    public void Configure(EntityTypeBuilder<ClientGuardian> builder)
    {
        builder.ToTable("ClientGuardians");
        builder.HasKey(g => g.Id);

        builder.Property(g => g.TenantId).IsRequired();
        builder.Property(g => g.ClientId).IsRequired();
        builder.Property(g => g.Name).IsRequired().HasMaxLength(ClientContact.NameMaxLength);
        builder.Property(g => g.Relationship).IsRequired().HasMaxLength(ClientContact.RelationshipMaxLength);
        builder.Property(g => g.Phone).HasMaxLength(PhoneNumber.MaxLength);
        builder.Property(g => g.Cpf).HasMaxLength(CpfNumber.Length);
    }
}
