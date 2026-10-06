namespace ServicesService.Domain.Entities;

public sealed record ReferenceContactData(FullName Name, string Relationship, PhoneNumber? Phone, ContactPurposes Purposes);

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
        var relationshipResult = ValidateRelationship(data.Relationship);
        if (relationshipResult.IsFailure)
        {
            return DomainResult.Failure<ClientReferenceContact>(relationshipResult.Error);
        }

        return DomainResult.Success(new ClientReferenceContact(
            id,
            clientId,
            data.Name.Value,
            relationshipResult.Value,
            data.Phone,
            data.Purposes));
    }

    internal DomainResult Update(ReferenceContactData data)
    {
        var reviseResult = Revise(data.Name, data.Relationship, data.Phone);
        if (reviseResult.IsFailure)
        {
            return reviseResult;
        }

        Purposes = data.Purposes;
        return DomainResult.Success();
    }
}
