using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

public sealed record ContactChange<TData>(Guid? Id, TData Data);

public abstract class ClientContact : TenantOwnedEntity
{
    public const int NameMinLength = 2;
    public const int NameMaxLength = 150;
    public const int RelationshipMaxLength = 60;

    public static readonly DomainError NameRequired = new("ClientContact.NameRequired", "O nome do contato é obrigatório.");

    public static readonly DomainError InvalidNameLength = new(
        "ClientContact.InvalidNameLength",
        $"O nome do contato deve ter entre {NameMinLength} e {NameMaxLength} caracteres.");

    public static readonly DomainError RelationshipRequired = new(
        "ClientContact.RelationshipRequired",
        "O vínculo do contato é obrigatório.");

    public static readonly DomainError RelationshipTooLong = new(
        "ClientContact.RelationshipTooLong",
        $"O vínculo do contato deve ter no máximo {RelationshipMaxLength} caracteres.");

    public Guid ClientId { get; private set; }
    public string Name { get; private set; }
    public string Relationship { get; private set; }
    public PhoneNumber? Phone { get; private set; }

    // EF Core materialization only.
    protected ClientContact()
    {
        Name = string.Empty;
        Relationship = string.Empty;
    }

    protected ClientContact(Guid id, Guid clientId, string name, string relationship, PhoneNumber? phone)
        : base(id)
    {
        ClientId = clientId;
        Name = name;
        Relationship = relationship;
        Phone = phone;
    }

    internal static DomainResult ValidateDetails(string name, string relationship)
    {
        var nameResult = ValidateName(name);
        if (nameResult.IsFailure)
        {
            return nameResult;
        }

        return ValidateRelationship(relationship);
    }

    protected DomainResult Revise(string name, string relationship, PhoneNumber? phone)
    {
        var detailsResult = ValidateDetails(name, relationship);
        if (detailsResult.IsFailure)
        {
            return detailsResult;
        }

        Name = name.Trim();
        Relationship = relationship.Trim();
        Phone = phone;
        return DomainResult.Success();
    }

    protected static DomainResult<string> ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length == 0)
        {
            return DomainResult.Failure<string>(NameRequired);
        }

        if (trimmed.Length < NameMinLength || trimmed.Length > NameMaxLength)
        {
            return DomainResult.Failure<string>(InvalidNameLength);
        }

        return DomainResult.Success(trimmed);
    }

    protected static DomainResult<string> ValidateRelationship(string relationship)
    {
        var trimmed = relationship?.Trim() ?? string.Empty;

        if (trimmed.Length == 0)
        {
            return DomainResult.Failure<string>(RelationshipRequired);
        }

        if (trimmed.Length > RelationshipMaxLength)
        {
            return DomainResult.Failure<string>(RelationshipTooLong);
        }

        return DomainResult.Success(trimmed);
    }
}
