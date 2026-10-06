using Admin.SharedKernel.ValueObjects;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Infrastructure.Persistence.Configurations;

public class ClientReferenceContactConfiguration : IEntityTypeConfiguration<ClientReferenceContact>
{
    public void Configure(EntityTypeBuilder<ClientReferenceContact> builder)
    {
        builder.ToTable(
            "ClientReferenceContacts",
            table => table.HasCheckConstraint("CK_ClientReferenceContacts_Purposes", "\"Purposes\" BETWEEN 1 AND 7"));
        builder.HasKey(r => r.Id);

        builder.Property(r => r.TenantId).IsRequired();
        builder.Property(r => r.ClientId).IsRequired();
        builder.Property(r => r.Name).IsRequired().HasMaxLength(ClientContact.NameMaxLength);
        builder.Property(r => r.Relationship).IsRequired().HasMaxLength(ClientContact.RelationshipMaxLength);
        builder.Property(r => r.Phone).HasMaxLength(PhoneNumber.MaxLength);
        builder.Property(r => r.Purposes)
            .HasConversion(purposes => (int)purposes.Value, value => ContactPurposes.Restore((ContactPurpose)value))
            .IsRequired();
    }
}
