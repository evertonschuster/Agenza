namespace ServicesService.Domain.Entities;

public sealed record ReferenceContactData(
    FullName Name,
    string Relationship,
    PhoneNumber? Phone,
    IReadOnlySet<ContactPurpose> Purposes);

public class ClientReferenceContact : ClientContact
{
    public static readonly DomainError PurposesRequired = new(
        "ClientReferenceContact.PurposesRequired",
        "Informe ao menos uma finalidade de contato.");

    public static readonly DomainError PurposeUnknown = new(
        "ClientReferenceContact.PurposeUnknown",
        "Informe apenas finalidades válidas para a pessoa de referência.");

    public IReadOnlySet<ContactPurpose> Purposes { get; private set; }

    // EF Core materialization only.
    private ClientReferenceContact()
    {
        Purposes = new HashSet<ContactPurpose>();
    }

    private ClientReferenceContact(
        Guid id,
        Guid clientId,
        string name,
        string relationship,
        PhoneNumber? phone,
        IReadOnlySet<ContactPurpose> purposes)
        : base(id, clientId, name, relationship, phone)
    {
        Purposes = purposes;
    }

    internal static DomainResult<ClientReferenceContact> Create(Guid clientId, ReferenceContactData data)
    {
        var relationshipResult = ValidateRelationship(data.Relationship);
        if (relationshipResult.IsFailure)
        {
            return DomainResult.Failure<ClientReferenceContact>(relationshipResult.Error);
        }

        var purposesResult = ValidatePurposes(data.Purposes);
        if (purposesResult.IsFailure)
        {
            return DomainResult.Failure<ClientReferenceContact>(purposesResult.Error);
        }

        return DomainResult.Success(new ClientReferenceContact(
            Guid.CreateVersion7(),
            clientId,
            data.Name.Value,
            relationshipResult.Value,
            data.Phone,
            purposesResult.Value));
    }

    internal DomainResult Update(ReferenceContactData data)
    {
        var purposesResult = ValidatePurposes(data.Purposes);
        if (purposesResult.IsFailure)
        {
            return purposesResult;
        }

        var reviseResult = Revise(data.Name.Value, data.Relationship, data.Phone);
        if (reviseResult.IsFailure)
        {
            return reviseResult;
        }

        Purposes = purposesResult.Value;
        return DomainResult.Success();
    }

    private static DomainResult<IReadOnlySet<ContactPurpose>> ValidatePurposes(IReadOnlySet<ContactPurpose> purposes)
    {
        if (purposes.Count == 0)
        {
            return DomainResult.Failure<IReadOnlySet<ContactPurpose>>(PurposesRequired);
        }

        if (!purposes.All(purpose => Enum.IsDefined(purpose)))
        {
            return DomainResult.Failure<IReadOnlySet<ContactPurpose>>(PurposeUnknown);
        }

        return DomainResult.Success<IReadOnlySet<ContactPurpose>>(new HashSet<ContactPurpose>(purposes));
    }
}
