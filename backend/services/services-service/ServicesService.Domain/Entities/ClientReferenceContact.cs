using Admin.SharedKernel.ValueObjects;
using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

public sealed record ReferenceContactData(string Name, string Relationship, PhoneNumber? Phone, ContactPurposes Purposes);

public class ClientReferenceContact : ClientContact
{
    public ContactPurposes Purposes { get; private set; }

    // EF Core materialization only.
    private ClientReferenceContact()
    {
        Purposes = null!;
    }

    private ClientReferenceContact(
        Guid id,
        Guid clientId,
        string name,
        string relationship,
        PhoneNumber? phone,
        ContactPurposes purposes)
        : base(id, clientId, name, relationship, phone)
    {
        Purposes = purposes;
    }

    internal static DomainResult<ClientReferenceContact> Create(Guid id, Guid clientId, ReferenceContactData data)
    {
        var nameResult = ValidateName(data.Name);
        if (nameResult.IsFailure)
        {
            return DomainResult.Failure<ClientReferenceContact>(nameResult.Error);
        }

        var relationshipResult = ValidateRelationship(data.Relationship);
        if (relationshipResult.IsFailure)
        {
            return DomainResult.Failure<ClientReferenceContact>(relationshipResult.Error);
        }

        return DomainResult.Success(new ClientReferenceContact(
            id,
            clientId,
            nameResult.Value,
            relationshipResult.Value,
            data.Phone,
            data.Purposes));
    }
}
