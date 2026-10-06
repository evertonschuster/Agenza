namespace ServicesService.Domain.ValueObjects;

[Flags]
public enum ContactPurpose
{
    None = 0,
    Emergency = 1,
    OperationalSupport = 2,
    DailyCommunication = 4,
}

public sealed record ContactPurposes
{
    public static readonly DomainError Required = new(
        "ContactPurposes.Required",
        "Informe ao menos uma finalidade de contato.");

    public ContactPurpose Value { get; }

    private ContactPurposes(ContactPurpose value)
    {
        Value = value;
    }

    public static DomainResult<ContactPurposes> Create(ContactPurpose value)
    {
        if (value == ContactPurpose.None)
        {
            return DomainResult.Failure<ContactPurposes>(Required);
        }

        return DomainResult.Success(new ContactPurposes(value));
    }

    public static ContactPurposes Restore(ContactPurpose value)
    {
        return new ContactPurposes(value);
    }
}
