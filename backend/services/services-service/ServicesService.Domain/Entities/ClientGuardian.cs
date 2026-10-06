using Admin.SharedKernel.ValueObjects;
using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

public sealed record GuardianData(string Name, string Relationship, PhoneNumber? Phone, CpfNumber? Cpf);

// CPF uniqueness is a rule between clients only - a guardian's CPF never takes part in it.
public class ClientGuardian : ClientContact
{
    public CpfNumber? Cpf { get; private set; }

    // EF Core materialization only.
    private ClientGuardian()
    {
    }

    private ClientGuardian(Guid id, Guid clientId, string name, string relationship, PhoneNumber? phone, CpfNumber? cpf)
        : base(id, clientId, name, relationship, phone)
    {
        Cpf = cpf;
    }

    internal static DomainResult<ClientGuardian> Create(Guid id, Guid clientId, GuardianData data)
    {
        var nameResult = ValidateName(data.Name);
        if (nameResult.IsFailure)
        {
            return DomainResult.Failure<ClientGuardian>(nameResult.Error);
        }

        var relationshipResult = ValidateRelationship(data.Relationship);
        if (relationshipResult.IsFailure)
        {
            return DomainResult.Failure<ClientGuardian>(relationshipResult.Error);
        }

        return DomainResult.Success(new ClientGuardian(
            id,
            clientId,
            nameResult.Value,
            relationshipResult.Value,
            data.Phone,
            data.Cpf));
    }
}
