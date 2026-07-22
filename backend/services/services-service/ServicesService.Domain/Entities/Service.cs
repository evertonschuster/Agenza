using ServicesService.Domain.Common;

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

    private Service(
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
        Name = name;
        Description = description;
        MinDurationMinutes = minDurationMinutes;
        DurationMinutes = durationMinutes;
        MaxDurationMinutes = maxDurationMinutes;
        Price = price;
        MaxDiscountPercentage = maxDiscountPercentage;
    }

    public static DomainResult<Service> Create(
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
    {
        var nameResult = ValidateName(name);
        if (nameResult.IsFailure)
        {
            return DomainResult.Failure<Service>(nameResult.Error);
        }

        var descriptionResult = ValidateDescription(description);
        if (descriptionResult.IsFailure)
        {
            return DomainResult.Failure<Service>(descriptionResult.Error);
        }

        var durationResult = ValidateDuration(minDurationMinutes, durationMinutes, maxDurationMinutes);
        if (durationResult.IsFailure)
        {
            return DomainResult.Failure<Service>(durationResult.Error);
        }

        var priceResult = ValidatePrice(price);
        if (priceResult.IsFailure)
        {
            return DomainResult.Failure<Service>(priceResult.Error);
        }

        var maxDiscountResult = ValidateMaxDiscountPercentage(maxDiscountPercentage);
        if (maxDiscountResult.IsFailure)
        {
            return DomainResult.Failure<Service>(maxDiscountResult.Error);
        }

        var (validatedMin, validatedDuration, validatedMax) = durationResult.Value;

        return DomainResult.Success(new Service(
            id,
            nameResult.Value,
            descriptionResult.Value,
            validatedDuration,
            validatedMin,
            validatedMax,
            priceResult.Value,
            maxDiscountResult.Value,
            categoryId,
            code));
    }

    public DomainResult Update(
        string name,
        string? description,
        int durationMinutes,
        int minDurationMinutes,
        int maxDurationMinutes,
        decimal price,
        decimal maxDiscountPercentage,
        Guid? categoryId)
    {
        // Every new value is validated before anything is assigned, so a
        // later validation failure (e.g. an invalid discount) can never leave
        // the entity with some fields already overwritten and others not.
        var nameResult = ValidateName(name);
        if (nameResult.IsFailure)
        {
            return DomainResult.Failure(nameResult.Error);
        }

        var descriptionResult = ValidateDescription(description);
        if (descriptionResult.IsFailure)
        {
            return DomainResult.Failure(descriptionResult.Error);
        }

        var durationResult = ValidateDuration(minDurationMinutes, durationMinutes, maxDurationMinutes);
        if (durationResult.IsFailure)
        {
            return DomainResult.Failure(durationResult.Error);
        }

        var priceResult = ValidatePrice(price);
        if (priceResult.IsFailure)
        {
            return DomainResult.Failure(priceResult.Error);
        }

        var maxDiscountResult = ValidateMaxDiscountPercentage(maxDiscountPercentage);
        if (maxDiscountResult.IsFailure)
        {
            return DomainResult.Failure(maxDiscountResult.Error);
        }

        var (validatedMin, validatedDuration, validatedMax) = durationResult.Value;

        CategoryId = categoryId;
        Name = nameResult.Value;
        Description = descriptionResult.Value;
        MinDurationMinutes = validatedMin;
        DurationMinutes = validatedDuration;
        MaxDurationMinutes = validatedMax;
        Price = priceResult.Value;
        MaxDiscountPercentage = maxDiscountResult.Value;

        return DomainResult.Success();
    }

    public void SetTags(IEnumerable<Tag> tags)
    {
        _tags.Clear();
        _tags.AddRange(tags);
    }

    private static DomainResult<string> ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length is 0 or > NameMaxLength)
        {
            return DomainResult.Failure<string>(new DomainError(
                "Service.Invalid",
                $"O nome do serviço é obrigatório e deve ter no máximo {NameMaxLength} caracteres."));
        }

        return DomainResult.Success(trimmed);
    }

    private static DomainResult<string?> ValidateDescription(string? description)
    {
        var trimmed = description?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            return DomainResult.Success<string?>(null);
        }

        if (trimmed.Length > DescriptionMaxLength)
        {
            return DomainResult.Failure<string?>(new DomainError(
                "Service.Invalid",
                $"A descrição do serviço deve ter no máximo {DescriptionMaxLength} caracteres."));
        }

        return DomainResult.Success<string?>(trimmed);
    }

    private static DomainResult<(int Min, int Duration, int Max)> ValidateDuration(int min, int duration, int max)
    {
        if (min < MinAllowedDurationMinutes)
        {
            return DomainResult.Failure<(int Min, int Duration, int Max)>(new DomainError(
                "Service.Invalid",
                $"A duração mínima do serviço deve ser de pelo menos {MinAllowedDurationMinutes} minuto."));
        }

        if (max > MaxAllowedDurationMinutes)
        {
            return DomainResult.Failure<(int Min, int Duration, int Max)>(new DomainError(
                "Service.Invalid",
                $"A duração máxima do serviço não pode ultrapassar {MaxAllowedDurationMinutes} minutos."));
        }

        if (min > max)
        {
            return DomainResult.Failure<(int Min, int Duration, int Max)>(new DomainError(
                "Service.Invalid",
                "A duração mínima do serviço não pode ser maior que a duração máxima."));
        }

        if (duration < min || duration > max)
        {
            return DomainResult.Failure<(int Min, int Duration, int Max)>(new DomainError(
                "Service.Invalid",
                "A duração do serviço deve estar entre a duração mínima e a duração máxima."));
        }

        return DomainResult.Success<(int Min, int Duration, int Max)>((min, duration, max));
    }

    private static DomainResult<decimal> ValidatePrice(decimal price)
    {
        if (price < 0)
        {
            return DomainResult.Failure<decimal>(
                new DomainError("Service.Invalid", "O preço do serviço não pode ser negativo."));
        }

        return DomainResult.Success(price);
    }

    private static DomainResult<decimal> ValidateMaxDiscountPercentage(decimal maxDiscountPercentage)
    {
        if (maxDiscountPercentage < 0 || maxDiscountPercentage > 100)
        {
            return DomainResult.Failure<decimal>(
                new DomainError("Service.Invalid", "O desconto máximo do serviço deve ser entre 0 e 100."));
        }

        return DomainResult.Success(maxDiscountPercentage);
    }
}
