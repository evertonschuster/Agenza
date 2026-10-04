using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

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
        builder.Property(g => g.Phone)
            .HasConversion(phone => phone!.Value, value => PhoneNumber.Restore(value))
            .HasMaxLength(PhoneNumber.MaxLength);
        builder.Property(g => g.Cpf)
            .HasConversion(cpf => cpf!.Value, value => CpfNumber.Restore(value))
            .HasMaxLength(CpfNumber.Length);
    }
}
