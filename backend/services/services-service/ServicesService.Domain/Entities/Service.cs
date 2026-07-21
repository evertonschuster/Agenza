using ServicesService.Domain.Common;
using ServicesService.Domain.Exceptions;

namespace ServicesService.Domain.Entities;

// Name uniqueness per tenant is a cross-aggregate rule, enforced in the CreateService/UpdateService use cases via IServiceRepository, mirroring Tag.
// Category/Tag existence are likewise cross-aggregate rules enforced by the use cases, not here.
public class Service : TenantOwnedEntity
{
    public const int NameMaxLength = 80;
    public const int DescriptionMaxLength = 500;
    public const int MinAllowedDurationMinutes = 1;
    public const int MaxAllowedDurationMinutes = 24 * 60;

    public int Code { get; private set; }
    public string Name { get; private set; }
    public string? Description { get; private set; }
    public int DurationMinutes { get; private set; }
    public int MinDurationMinutes { get; private set; }
    public int MaxDurationMinutes { get; private set; }
    public decimal Price { get; private set; }
    public decimal MaxDiscountPercentage { get; private set; }
    public Guid? CategoryId { get; private set; }

    private readonly List<Tag> _tags = [];
    public IReadOnlyCollection<Tag> Tags => _tags;

    // EF Core materialization only.
    private Service()
    {
        Name = string.Empty;
    }

    public Service(
        Guid id,
        string name,
        string? description,
        int durationMinutes,
        int minDurationMinutes,
        int maxDurationMinutes,
        decimal price,
        decimal maxDiscountPercentage,
        Guid? categoryId,
        int code)
        : base(id)
    {
        Code = code;
        CategoryId = categoryId;
        Name = ValidateName(name);
        Description = ValidateDescription(description);
        (MinDurationMinutes, DurationMinutes, MaxDurationMinutes) =
            ValidateDuration(minDurationMinutes, durationMinutes, maxDurationMinutes);
        Price = ValidatePrice(price);
        MaxDiscountPercentage = ValidateMaxDiscountPercentage(maxDiscountPercentage);
    }

    public void Update(
        string name,
        string? description,
        int durationMinutes,
        int minDurationMinutes,
        int maxDurationMinutes,
        decimal price,
        decimal maxDiscountPercentage,
        Guid? categoryId)
    {
        CategoryId = categoryId;
        Name = ValidateName(name);
        Description = ValidateDescription(description);
        (MinDurationMinutes, DurationMinutes, MaxDurationMinutes) =
            ValidateDuration(minDurationMinutes, durationMinutes, maxDurationMinutes);
        Price = ValidatePrice(price);
        MaxDiscountPercentage = ValidateMaxDiscountPercentage(maxDiscountPercentage);
    }

    public void SetTags(IEnumerable<Tag> tags)
    {
        _tags.Clear();
        _tags.AddRange(tags);
    }

    private static string ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length is 0 or > NameMaxLength)
        {
            throw new InvalidServiceException(
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
            throw new InvalidServiceException(
                $"A descrição do serviço deve ter no máximo {DescriptionMaxLength} caracteres.");
        }

        return trimmed;
    }

    private static (int Min, int Duration, int Max) ValidateDuration(int min, int duration, int max)
    {
        if (min < MinAllowedDurationMinutes)
        {
            throw new InvalidServiceException(
                $"A duração mínima do serviço deve ser de pelo menos {MinAllowedDurationMinutes} minuto.");
        }

        if (max > MaxAllowedDurationMinutes)
        {
            throw new InvalidServiceException(
                $"A duração máxima do serviço não pode ultrapassar {MaxAllowedDurationMinutes} minutos.");
        }

        if (min > max)
        {
            throw new InvalidServiceException(
                "A duração mínima do serviço não pode ser maior que a duração máxima.");
        }

        if (duration < min || duration > max)
        {
            throw new InvalidServiceException(
                "A duração do serviço deve estar entre a duração mínima e a duração máxima.");
        }

        return (min, duration, max);
    }

    private static decimal ValidatePrice(decimal price)
    {
        if (price < 0)
        {
            throw new InvalidServiceException("O preço do serviço não pode ser negativo.");
        }

        return price;
    }

    private static decimal ValidateMaxDiscountPercentage(decimal maxDiscountPercentage)
    {
        if (maxDiscountPercentage < 0 || maxDiscountPercentage > 100)
        {
            throw new InvalidServiceException("O desconto máximo do serviço deve ser entre 0 e 100.");
        }

        return maxDiscountPercentage;
    }
}
