using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services;

public static class ServiceStatusNames
{
    public const string UnknownCode = "ServiceStatus.Unknown";

    private const string AllFilter = "all";

    private static readonly IReadOnlyList<(string Name, ServiceStatus Status)> Catalog =
    [
        ("active", ServiceStatus.Active),
        ("inactive", ServiceStatus.Inactive),
    ];

    public static readonly string UnknownMessage =
        $"A situação deve ser uma das seguintes: {string.Join(", ", Catalog.Select(entry => entry.Name).Append(AllFilter))}.";

    public static bool IsKnownFilter(string? name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return true;
        }

        if (string.Equals(name.Trim(), AllFilter, StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return ToFilter(name) is not null;
    }

    public static ServiceStatus? ToFilter(string? name)
    {
        foreach (var entry in Catalog)
        {
            if (string.Equals(entry.Name, name?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return entry.Status;
            }
        }

        return null;
    }

    public static string ToName(ServiceStatus status)
    {
        return Catalog.Single(entry => entry.Status == status).Name;
    }
}
