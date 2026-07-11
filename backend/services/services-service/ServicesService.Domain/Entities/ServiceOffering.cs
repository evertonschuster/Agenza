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
                $"O nome do serviço é obrigatório e deve ter no máximo {NameMaxLength} caracteres.");
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
                $"A descrição do serviço deve ter no máximo {DescriptionMaxLength} caracteres.");
        }

        return trimmed;
    }

    private static int ValidateDurationMinutes(int durationMinutes)
    {
        if (durationMinutes is < 1 or > MaxDurationMinutes)
        {
            throw new InvalidServiceOfferingException(
                $"A duração do serviço deve ser entre 1 e {MaxDurationMinutes} minutos.");
        }

        return durationMinutes;
    }

    private static decimal ValidatePrice(decimal price)
    {
        if (price < 0)
        {
            throw new InvalidServiceOfferingException("O preço do serviço não pode ser negativo.");
        }

        return price;
    }
}
