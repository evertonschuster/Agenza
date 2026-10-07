using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ServicesService.Infrastructure.Persistence.Configurations;

public class ClientReferenceContactConfiguration : IEntityTypeConfiguration<ClientReferenceContact>
{
    public void Configure(EntityTypeBuilder<ClientReferenceContact> builder)
    {
        builder.ToTable(
            "ClientReferenceContacts",
            table => table.HasCheckConstraint("CK_ClientReferenceContacts_Purposes", "\"Purposes\" BETWEEN 1 AND 7"));
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Id).ValueGeneratedNever();

        builder.Property(r => r.TenantId).IsRequired();
        builder.Property(r => r.ClientId).IsRequired();
        builder.Property(r => r.Name).IsRequired().HasMaxLength(ClientContact.NameMaxLength);
        builder.Property(r => r.Relationship).IsRequired().HasMaxLength(ClientContact.RelationshipMaxLength);
        builder.Property(r => r.Phone).HasMaxLength(PhoneNumber.MaxLength);
        builder.Property(r => r.Purposes)
            .HasConversion(
                purposes => ToStored(purposes),
                stored => FromStored(stored),
                new ValueComparer<IReadOnlySet<ContactPurpose>>(
                    (left, right) => left!.SetEquals(right!),
                    purposes => purposes.Aggregate(0, (hash, purpose) => hash ^ (int)purpose),
                    purposes => new HashSet<ContactPurpose>(purposes)))
            .IsRequired();
    }

    private static int ToStored(IReadOnlySet<ContactPurpose> purposes)
    {
        var stored = 0;

        foreach (var purpose in purposes)
        {
            stored |= (int)purpose;
        }

        return stored;
    }

    private static IReadOnlySet<ContactPurpose> FromStored(int stored)
    {
        var purposes = new HashSet<ContactPurpose>();

        foreach (var purpose in Enum.GetValues<ContactPurpose>())
        {
            if ((stored & (int)purpose) != 0)
            {
                purposes.Add(purpose);
            }
        }

        return purposes;
    }
}
