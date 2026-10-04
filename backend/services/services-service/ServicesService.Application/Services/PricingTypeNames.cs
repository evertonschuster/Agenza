using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services;

public static class PricingTypeNames
{
    public const string UnknownCode = "PricingType.Unknown";

    private static readonly IReadOnlyList<(string Name, PricingType Type)> Catalog =
    [
        ("fixed", PricingType.Fixed),
        ("variable", PricingType.Variable),
    ];

    public static readonly string UnknownMessage =
        $"A forma de cobrança deve ser uma das seguintes: {string.Join(", ", Catalog.Select(entry => entry.Name))}.";

    public static readonly DomainError Unknown = new(UnknownCode, UnknownMessage);

    public static bool IsKnown(string? name)
    {
        return ToPricingType(name) is not null;
    }

    public static PricingType? ToPricingType(string? name)
    {
        foreach (var entry in Catalog)
        {
            if (string.Equals(entry.Name, name?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return entry.Type;
            }
        }

        return null;
    }

    public static string ToName(PricingType type)
    {
        return Catalog.Single(entry => entry.Type == type).Name;
    }
}
