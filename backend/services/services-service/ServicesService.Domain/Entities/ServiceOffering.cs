using ServicesService.Domain.Common;
using ServicesService.Domain.Exceptions;

namespace ServicesService.Domain.Entities;

/// <summary>
/// An item in the business's services catalog (docs/VISION.md "services
/// catalog") that clients book appointments for - e.g. "Haircut", "Deep
/// tissue massage". Name uniqueness per tenant is a cross-aggregate rule
/// and lives in the CreateServiceOffering/UpdateServiceOffering use cases
/// (via IServiceOfferingRepository), mirroring Tag.
/// </summary>
public class ServiceOffering : TenantOwnedEntity
{
    public const int NameMaxLength = 100;
    public const int DescriptionMaxLength = 500;
    public const int MaxDurationMinutes = 24 * 60;

    public string Name { get; private set; }
    public string? Description { get; private set; }
    public int DurationMinutes { get; private set; }
    public decimal Price { get; private set; }

    // EF Core materialization only.
    private ServiceOffering()
    {
        Name = string.Empty;
    }

    public ServiceOffering(Guid id, string name, string? description, int durationMinutes, decimal price)
        : base(id)
    {
        Name = ValidateName(name);
        Description = ValidateDescription(description);
        DurationMinutes = ValidateDurationMinutes(durationMinutes);
        Price = ValidatePrice(price);
    }

    protected override BusinessException CreateTenantRequiredException() =>
        new InvalidServiceOfferingException("A service offering must belong to a tenant.");

    public void Update(string name, string? description, int durationMinutes, decimal price)
    {
        Name = ValidateName(name);
        Description = ValidateDescription(description);
        DurationMinutes = ValidateDurationMinutes(durationMinutes);
        Price = ValidatePrice(price);
    }

    private static string ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length is 0 or > NameMaxLength)
        {
            throw new InvalidServiceOfferingException(
                $"Service offering name is required and must be at most {NameMaxLength} characters.");
        }

        return trimmed;
    }

    private static string? ValidateDescription(string? description)
    {
        var trimmed = description?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            return null;
        }

        if (trimmed.Length > DescriptionMaxLength)
        {
            throw new InvalidServiceOfferingException(
                $"Service offering description must be at most {DescriptionMaxLength} characters.");
        }

        return trimmed;
    }

    private static int ValidateDurationMinutes(int durationMinutes)
    {
        if (durationMinutes is < 1 or > MaxDurationMinutes)
        {
            throw new InvalidServiceOfferingException(
                $"Service offering duration must be between 1 and {MaxDurationMinutes} minutes.");
        }

        return durationMinutes;
    }

    private static decimal ValidatePrice(decimal price)
    {
        if (price < 0)
        {
            throw new InvalidServiceOfferingException("Service offering price cannot be negative.");
        }

        return price;
    }
}
