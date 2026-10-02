using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

// CPF uniqueness is a rule between clients only - a guardian's CPF never takes part in it.
public class ClientGuardian : ClientContact
{
    public string? Cpf { get; private set; }

    // EF Core materialization only.
    private ClientGuardian()
    {
    }

    private ClientGuardian(Guid id, string name, string relationship, string? phone, string? cpf)
        : base(id, name, relationship, phone)
    {
        Cpf = cpf;
    }

    public static DomainResult<ClientGuardian> Create(
        Guid id,
        string name,
        string relationship,
        string? phone,
        string? cpf)
    {
        var nameResult = ValidateName(name);
        if (nameResult.IsFailure)
        {
            return DomainResult.Failure<ClientGuardian>(nameResult.Error);
        }

        var relationshipResult = ValidateRelationship(relationship);
        if (relationshipResult.IsFailure)
        {
            return DomainResult.Failure<ClientGuardian>(relationshipResult.Error);
        }

        var phoneResult = ValidatePhone(phone);
        if (phoneResult.IsFailure)
        {
            return DomainResult.Failure<ClientGuardian>(phoneResult.Error);
        }

        var cpfResult = CpfNumber.Normalize(cpf);
        if (cpfResult.IsFailure)
        {
            return DomainResult.Failure<ClientGuardian>(cpfResult.Error);
        }

        return DomainResult.Success(new ClientGuardian(
            id,
            nameResult.Value,
            relationshipResult.Value,
            phoneResult.Value,
            cpfResult.Value));
    }
}
