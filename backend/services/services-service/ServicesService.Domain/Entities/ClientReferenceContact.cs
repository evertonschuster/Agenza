using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

public class ClientReferenceContact : ClientContact
{
    public ContactPurpose Purposes { get; private set; }

    // EF Core materialization only.
    private ClientReferenceContact()
    {
    }

    private ClientReferenceContact(Guid id, string name, string relationship, PhoneNumber? phone, ContactPurpose purposes)
        : base(id, name, relationship, phone)
    {
        Purposes = purposes;
    }

    public static DomainResult<ClientReferenceContact> Create(
        Guid id,
        string name,
        string relationship,
        PhoneNumber? phone,
        IEnumerable<string>? purposes)
    {
        var nameResult = ValidateName(name);
        if (nameResult.IsFailure)
        {
            return DomainResult.Failure<ClientReferenceContact>(nameResult.Error);
        }

        var relationshipResult = ValidateRelationship(relationship);
        if (relationshipResult.IsFailure)
        {
            return DomainResult.Failure<ClientReferenceContact>(relationshipResult.Error);
        }

        var purposesResult = ContactPurposes.Parse(purposes);
        if (purposesResult.IsFailure)
        {
            return DomainResult.Failure<ClientReferenceContact>(purposesResult.Error);
        }

        return DomainResult.Success(new ClientReferenceContact(
            id,
            nameResult.Value,
            relationshipResult.Value,
            phone,
            purposesResult.Value));
    }
}
