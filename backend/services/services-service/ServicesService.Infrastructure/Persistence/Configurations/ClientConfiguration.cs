using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using ServicesService.Domain.Entities;

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
            .IsRequired()
            .HasMaxLength(FullName.MaxLength);
        builder.Property(c => c.Phone).HasMaxLength(PhoneNumber.MaxLength);
        builder.Property(c => c.Email).HasMaxLength(EmailAddress.MaxLength);
        builder.Property(c => c.Cpf).HasMaxLength(CpfNumber.Length);
        builder.Property(c => c.AdministrativeNotes).HasMaxLength(AdministrativeNotes.MaxLength);
        builder.Property(c => c.Status).IsRequired().HasConversion<string>().HasMaxLength(16);

        // CPF collides among live clients whatever their status, e-mail only among live active ones. The database
        // decides concurrent writes (docs/adr/0044).
        builder.HasIndex(c => new { c.TenantId, c.Cpf })
            .IsUnique()
            .HasFilter("\"Cpf\" IS NOT NULL AND \"DeletedAt\" IS NULL");
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
