using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

public abstract class ClientContact : TenantOwnedEntity
{
    public const int NameMinLength = 2;
    public const int NameMaxLength = 150;
    public const int RelationshipMaxLength = 60;

    public Guid ClientId { get; private set; }
    public string Name { get; private set; }
    public string Relationship { get; private set; }
    public string? Phone { get; private set; }

    // EF Core materialization only.
    protected ClientContact()
    {
        Name = string.Empty;
        Relationship = string.Empty;
    }

    protected ClientContact(Guid id, string name, string relationship, string? phone)
        : base(id)
    {
        Name = name;
        Relationship = relationship;
        Phone = phone;
    }

    internal void AssignClient(Guid clientId) => ClientId = clientId;

    protected static DomainResult<string> ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length < NameMinLength || trimmed.Length > NameMaxLength)
        {
            return DomainResult.Failure<string>(new DomainError(
                "Client.Invalid",
                $"O nome do contato é obrigatório e deve ter entre {NameMinLength} e {NameMaxLength} caracteres."));
        }

        return DomainResult.Success(trimmed);
    }

    protected static DomainResult<string> ValidateRelationship(string relationship)
    {
        var trimmed = relationship?.Trim() ?? string.Empty;

        if (trimmed.Length is 0 or > RelationshipMaxLength)
        {
            return DomainResult.Failure<string>(new DomainError(
                "Client.Invalid",
                $"O vínculo do contato é obrigatório e deve ter no máximo {RelationshipMaxLength} caracteres."));
        }

        return DomainResult.Success(trimmed);
    }

    protected static DomainResult<string?> ValidatePhone(string? phone) => PhoneNumber.Normalize(phone);
}
