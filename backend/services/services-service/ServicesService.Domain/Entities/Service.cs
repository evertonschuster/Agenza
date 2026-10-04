using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

public class Service : TenantOwnedEntity
{
    public const int NameMaxLength = 80;
    public const int InternalDescriptionMaxLength = 500;
    public const int ClientDescriptionMaxLength = 500;
    public const int MaxTags = 10;

    public static readonly DomainError NameRequired = new("Service.NameRequired", "O nome do serviço é obrigatório.");

    public static readonly DomainError NameTooLong = new(
        "Service.NameTooLong",
        $"O nome do serviço deve ter no máximo {NameMaxLength} caracteres.");

    public static readonly DomainError InternalDescriptionTooLong = new(
        "Service.InternalDescriptionTooLong",
        $"A descrição interna deve ter no máximo {InternalDescriptionMaxLength} caracteres.");

    public static readonly DomainError ClientDescriptionTooLong = new(
        "Service.ClientDescriptionTooLong",
        $"A descrição para o cliente deve ter no máximo {ClientDescriptionMaxLength} caracteres.");

    public static readonly DomainError PriceRequired = new(
        "Service.PriceRequired",
        "Informe o valor do serviço de preço fixo.");

    public static readonly DomainError PriceNotAllowed = new(
        "Service.PriceNotAllowed",
        "O serviço de preço variável não tem valor fixo.");

    public static readonly DomainError TooManyTags = new(
        "Service.TooManyTags",
        $"Informe no máximo {MaxTags} etiquetas.");

    public static readonly DomainError DuplicateTags = new(
        "Service.DuplicateTags",
        "A mesma etiqueta não pode ser informada mais de uma vez.");

    public static readonly DomainError InvalidTag = new("Service.InvalidTag", "Informe etiquetas válidas.");

    public static readonly DomainError AlreadyActive = new("Service.AlreadyActive", "O serviço já está ativo.");

    public static readonly DomainError AlreadyInactive = new("Service.AlreadyInactive", "O serviço já está inativo.");

    public int Code { get; private set; }
    public string Name { get; private set; }
    public Guid? CategoryId { get; private set; }
    public string? InternalDescription { get; private set; }
    public string? ClientDescription { get; private set; }
    public int DurationMinutes { get; private set; }
    public int PreparationMinutes { get; private set; }
    public int CleanupMinutes { get; private set; }
    public int? MinDurationMinutes { get; private set; }
    public int? MaxDurationMinutes { get; private set; }
    public PricingType PricingType { get; private set; }
    public Money? Price { get; private set; }
    public Percentage? MaxDiscountPercentage { get; private set; }
    public ServiceStatus Status { get; private set; }

    public int TotalDurationMinutes => PreparationMinutes + DurationMinutes + CleanupMinutes;

    private readonly List<ServiceTag> _tags = [];
    public IReadOnlyCollection<ServiceTag> Tags => _tags;

    // EF Core materialization only.
    private Service()
    {
        Name = string.Empty;
    }

    private Service(
        Guid id,
        string name,
        Guid? categoryId,
        string? internalDescription,
        string? clientDescription,
        ServiceDuration duration,
        PricingType pricingType,
        Money? price,
        Percentage? maxDiscountPercentage,
        int code)
        : base(id)
    {
        Code = code;
        Name = name;
        CategoryId = categoryId;
        InternalDescription = internalDescription;
        ClientDescription = clientDescription;
        DurationMinutes = duration.DurationMinutes;
        PreparationMinutes = duration.PreparationMinutes;
        CleanupMinutes = duration.CleanupMinutes;
        MinDurationMinutes = duration.MinDurationMinutes;
        MaxDurationMinutes = duration.MaxDurationMinutes;
        PricingType = pricingType;
        Price = price;
        MaxDiscountPercentage = maxDiscountPercentage;
        Status = ServiceStatus.Active;
    }

    public static DomainResult<Service> Create(
        Guid id,
        string name,
        Guid? categoryId,
        string? internalDescription,
        string? clientDescription,
        ServiceDuration duration,
        PricingType pricingType,
        Money? price,
        Percentage? maxDiscountPercentage,
        IReadOnlyCollection<Guid> tagIds,
        int code)
    {
        var textResult = Validate(name, internalDescription, clientDescription, pricingType, price, tagIds);
        if (textResult.IsFailure)
        {
            return DomainResult.Failure<Service>(textResult.Error);
        }

        var service = new Service(
            id,
            textResult.Value.Name,
            categoryId,
            textResult.Value.InternalDescription,
            textResult.Value.ClientDescription,
            duration,
            pricingType,
            price,
            maxDiscountPercentage,
            code);

        service.SyncTags(tagIds);

        return DomainResult.Success(service);
    }

    public DomainResult Update(
        string name,
        Guid? categoryId,
        string? internalDescription,
        string? clientDescription,
        ServiceDuration duration,
        PricingType pricingType,
        Money? price,
        Percentage? maxDiscountPercentage,
        IReadOnlyCollection<Guid> tagIds)
    {
        var textResult = Validate(name, internalDescription, clientDescription, pricingType, price, tagIds);
        if (textResult.IsFailure)
        {
            return DomainResult.Failure(textResult.Error);
        }

        Name = textResult.Value.Name;
        CategoryId = categoryId;
        InternalDescription = textResult.Value.InternalDescription;
        ClientDescription = textResult.Value.ClientDescription;
        DurationMinutes = duration.DurationMinutes;
        PreparationMinutes = duration.PreparationMinutes;
        CleanupMinutes = duration.CleanupMinutes;
        MinDurationMinutes = duration.MinDurationMinutes;
        MaxDurationMinutes = duration.MaxDurationMinutes;
        PricingType = pricingType;
        Price = price;
        MaxDiscountPercentage = maxDiscountPercentage;
        SyncTags(tagIds);

        return DomainResult.Success();
    }

    public DomainResult Inactivate()
    {
        if (Status == ServiceStatus.Inactive)
        {
            return DomainResult.Failure(AlreadyInactive);
        }

        Status = ServiceStatus.Inactive;

        return DomainResult.Success();
    }

    public DomainResult Reactivate()
    {
        if (Status == ServiceStatus.Active)
        {
            return DomainResult.Failure(AlreadyActive);
        }

        Status = ServiceStatus.Active;

        return DomainResult.Success();
    }

    private void SyncTags(IReadOnlyCollection<Guid> tagIds)
    {
        _tags.RemoveAll(link => !tagIds.Contains(link.TagId));

        foreach (var tagId in tagIds)
        {
            if (_tags.Exists(link => link.TagId == tagId))
            {
                continue;
            }

            _tags.Add(ServiceTag.Create(Guid.CreateVersion7(), Id, tagId));
        }
    }

    private static DomainResult<NormalizedText> Validate(
        string name,
        string? internalDescription,
        string? clientDescription,
        PricingType pricingType,
        Money? price,
        IReadOnlyCollection<Guid> tagIds)
    {
        var nameResult = ValidateName(name);
        if (nameResult.IsFailure)
        {
            return DomainResult.Failure<NormalizedText>(nameResult.Error);
        }

        var internalDescriptionResult = ValidateDescription(
            internalDescription,
            InternalDescriptionMaxLength,
            InternalDescriptionTooLong);
        if (internalDescriptionResult.IsFailure)
        {
            return DomainResult.Failure<NormalizedText>(internalDescriptionResult.Error);
        }

        var clientDescriptionResult = ValidateDescription(
            clientDescription,
            ClientDescriptionMaxLength,
            ClientDescriptionTooLong);
        if (clientDescriptionResult.IsFailure)
        {
            return DomainResult.Failure<NormalizedText>(clientDescriptionResult.Error);
        }

        var pricingResult = ValidatePricing(pricingType, price);
        if (pricingResult.IsFailure)
        {
            return DomainResult.Failure<NormalizedText>(pricingResult.Error);
        }

        var tagsResult = ValidateTags(tagIds);
        if (tagsResult.IsFailure)
        {
            return DomainResult.Failure<NormalizedText>(tagsResult.Error);
        }

        return DomainResult.Success(new NormalizedText(
            nameResult.Value,
            internalDescriptionResult.Value,
            clientDescriptionResult.Value));
    }

    private static DomainResult<string> ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length == 0)
        {
            return DomainResult.Failure<string>(NameRequired);
        }

        if (trimmed.Length > NameMaxLength)
        {
            return DomainResult.Failure<string>(NameTooLong);
        }

        return DomainResult.Success(trimmed);
    }

    private static DomainResult<string?> ValidateDescription(string? description, int maxLength, DomainError tooLong)
    {
        var trimmed = description?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            return DomainResult.Success<string?>(null);
        }

        if (trimmed.Length > maxLength)
        {
            return DomainResult.Failure<string?>(tooLong);
        }

        return DomainResult.Success<string?>(trimmed);
    }

    private static DomainResult ValidatePricing(PricingType pricingType, Money? price)
    {
        if (pricingType == PricingType.Fixed && price is null)
        {
            return DomainResult.Failure(PriceRequired);
        }

        if (pricingType == PricingType.Variable && price is not null)
        {
            return DomainResult.Failure(PriceNotAllowed);
        }

        return DomainResult.Success();
    }

    private static DomainResult ValidateTags(IReadOnlyCollection<Guid> tagIds)
    {
        if (tagIds.Count > MaxTags)
        {
            return DomainResult.Failure(TooManyTags);
        }

        if (tagIds.Any(tagId => tagId == Guid.Empty))
        {
            return DomainResult.Failure(InvalidTag);
        }

        if (tagIds.Distinct().Count() != tagIds.Count)
        {
            return DomainResult.Failure(DuplicateTags);
        }

        return DomainResult.Success();
    }

    private sealed record NormalizedText(string Name, string? InternalDescription, string? ClientDescription);
}
