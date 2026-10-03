using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Infrastructure.Persistence.Configurations;

public class ClientConfiguration : IEntityTypeConfiguration<Client>
{
    public void Configure(EntityTypeBuilder<Client> builder)
    {
        var statuses = string.Join(", ", Enum.GetNames<ClientStatus>().Select(status => $"'{status}'"));
        builder.ToTable(
            "Clients",
            table => table.HasCheckConstraint("CK_Clients_Status", $"\"Status\" IN ({statuses})"));
        builder.HasKey(c => c.Id);
        builder.HasAlternateKey(c => new { c.TenantId, c.Id });

        builder.Property(c => c.TenantId).IsRequired();
        builder.Property(c => c.FullName)
            .HasConversion(fullName => fullName.Value, value => FullName.Restore(value))
            .IsRequired()
            .HasMaxLength(FullName.MaxLength);
        builder.Property(c => c.BirthDate)
            .HasConversion(birthDate => birthDate!.Value, value => BirthDate.Restore(value));
        builder.Property(c => c.Phone)
            .HasConversion(phone => phone!.Value, value => PhoneNumber.Restore(value))
            .HasMaxLength(PhoneNumber.MaxLength);
        builder.Property(c => c.Email)
            .HasConversion(email => email!.Value, value => EmailAddress.Restore(value))
            .HasMaxLength(EmailAddress.MaxLength);
        builder.Property(c => c.Cpf)
            .HasConversion(cpf => cpf!.Value, value => CpfNumber.Restore(value))
            .HasMaxLength(CpfNumber.Length);
        builder.Property(c => c.AdministrativeNotes)
            .HasConversion(notes => notes!.Value, value => AdministrativeNotes.Restore(value))
            .HasMaxLength(AdministrativeNotes.MaxLength);
        builder.Property(c => c.Status).IsRequired().HasConversion<string>().HasMaxLength(16);

        // CPF is never reused, so its index has no situation filter; e-mail only collides among live active
        // clients. The database decides concurrent writes (docs/adr/0044).
        builder.HasIndex(c => new { c.TenantId, c.Cpf })
            .IsUnique()
            .HasFilter("\"Cpf\" IS NOT NULL");
        builder.HasIndex(c => new { c.TenantId, c.Email })
            .IsUnique()
            .HasFilter("\"Email\" IS NOT NULL AND \"Status\" = 'Active' AND \"DeletedAt\" IS NULL");

        builder.HasMany(c => c.Guardians)
            .WithOne()
            .HasForeignKey(g => new { g.TenantId, g.ClientId })
            .HasPrincipalKey(c => new { c.TenantId, c.Id })
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(c => c.ReferenceContacts)
            .WithOne()
            .HasForeignKey(r => new { r.TenantId, r.ClientId })
            .HasPrincipalKey(c => new { c.TenantId, c.Id })
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(c => c.Guardians).UsePropertyAccessMode(PropertyAccessMode.Field);
        builder.Navigation(c => c.ReferenceContacts).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
