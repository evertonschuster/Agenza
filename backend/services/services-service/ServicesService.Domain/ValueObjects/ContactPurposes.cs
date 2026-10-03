using ServicesService.Domain.Common;

namespace ServicesService.Domain.ValueObjects;

[Flags]
public enum ContactPurpose
{
    None = 0,
    Emergency = 1,
    OperationalSupport = 2,
    DailyCommunication = 4,
}

public static class ContactPurposes
{
    private static readonly IReadOnlyList<(string Name, ContactPurpose Purpose)> Catalog =
    [
        ("emergency", ContactPurpose.Emergency),
        ("operationalSupport", ContactPurpose.OperationalSupport),
        ("dailyCommunication", ContactPurpose.DailyCommunication),
    ];

    private static IReadOnlyList<string> Names { get; } = Catalog.Select(entry => entry.Name).ToList();

    public static readonly DomainError Unknown = new(
        "ContactPurposes.Unknown",
        $"A finalidade deve ser uma das seguintes: {string.Join(", ", Names)}.");

    public static readonly DomainError Required = new(
        "ContactPurposes.Required",
        "Informe ao menos uma finalidade de contato.");

    public static DomainResult<ContactPurpose> Parse(IEnumerable<string>? names)
    {
        var purposes = ContactPurpose.None;

        foreach (var name in names ?? [])
        {
            var match = Catalog.FirstOrDefault(entry =>
                string.Equals(entry.Name, name?.Trim(), StringComparison.OrdinalIgnoreCase));

            if (match.Name is null)
            {
                return DomainResult.Failure<ContactPurpose>(Unknown);
            }

            purposes |= match.Purpose;
        }

        if (purposes == ContactPurpose.None)
        {
            return DomainResult.Failure<ContactPurpose>(Required);
        }

        return DomainResult.Success(purposes);
    }

    public static IReadOnlyList<string> ToNames(ContactPurpose purposes) =>
        Catalog.Where(entry => purposes.HasFlag(entry.Purpose)).Select(entry => entry.Name).ToList();
}
