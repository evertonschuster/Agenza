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

    public static IReadOnlyList<string> Names { get; } = Catalog.Select(entry => entry.Name).ToList();

    public static bool IsKnown(string name) =>
        Catalog.Any(entry => string.Equals(entry.Name, name?.Trim(), StringComparison.OrdinalIgnoreCase));

    public static DomainResult<ContactPurpose> Parse(IEnumerable<string>? names)
    {
        var purposes = ContactPurpose.None;

        foreach (var name in names ?? [])
        {
            var match = Catalog.FirstOrDefault(entry =>
                string.Equals(entry.Name, name?.Trim(), StringComparison.OrdinalIgnoreCase));

            if (match.Name is null)
            {
                return DomainResult.Failure<ContactPurpose>(new DomainError(
                    "Client.Invalid",
                    $"A finalidade deve ser uma das seguintes: {string.Join(", ", Names)}."));
            }

            purposes |= match.Purpose;
        }

        if (purposes == ContactPurpose.None)
        {
            return DomainResult.Failure<ContactPurpose>(new DomainError(
                "Client.Invalid",
                "Informe ao menos uma finalidade para a pessoa de referência."));
        }

        return DomainResult.Success(purposes);
    }

    public static IReadOnlyList<string> ToNames(ContactPurpose purposes) =>
        Catalog.Where(entry => purposes.HasFlag(entry.Purpose)).Select(entry => entry.Name).ToList();
}
