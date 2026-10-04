using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Clients;

public static class ContactPurposeNames
{
    public const string UnknownCode = "ContactPurposes.Unknown";

    private static readonly IReadOnlyList<(string Name, ContactPurpose Purpose)> Catalog =
    [
        ("emergency", ContactPurpose.Emergency),
        ("operationalSupport", ContactPurpose.OperationalSupport),
        ("dailyCommunication", ContactPurpose.DailyCommunication),
    ];

    public static readonly string UnknownMessage =
        $"A finalidade deve ser uma das seguintes: {string.Join(", ", Catalog.Select(entry => entry.Name))}.";

    public static bool AreKnown(IEnumerable<string>? names)
    {
        return (names ?? []).All(name => Find(name) is not null);
    }

    public static ContactPurpose ToPurposes(IEnumerable<string>? names)
    {
        var purposes = ContactPurpose.None;

        foreach (var name in names ?? [])
        {
            purposes |= Find(name) ?? ContactPurpose.None;
        }

        return purposes;
    }

    public static IReadOnlyList<string> ToNames(ContactPurpose purposes)
    {
        return Catalog.Where(entry => purposes.HasFlag(entry.Purpose)).Select(entry => entry.Name).ToList();
    }

    private static ContactPurpose? Find(string? name)
    {
        foreach (var entry in Catalog)
        {
            if (string.Equals(entry.Name, name?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return entry.Purpose;
            }
        }

        return null;
    }
}
