using ServicesService.Domain.Common;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Domain.Entities;

public class Service : TenantOwnedEntity
{
    public const int NameMaxLength = 80;
    public const int DescriptionMaxLength = 500;
    public const int MaxTags = 10;

    public static readonly DomainError NameRequired = new("Service.NameRequired", "O nome do serviço é obrigatório.");

    public static readonly DomainError NameTooLong = new(
        "Service.NameTooLong",
        $"O nome do serviço deve ter no máximo {NameMaxLength} caracteres.");

    public static readonly DomainError DescriptionTooLong = new(
        "Service.DescriptionTooLong",
        $"A descrição do serviço deve ter no máximo {DescriptionMaxLength} caracteres.");

    public static readonly DomainError TooManyTags = new(
        "Service.TooManyTags",
        $"Informe no máximo {MaxTags} etiquetas.");

    public static readonly DomainError DuplicateTags = new(
        "Service.DuplicateTags",
        "A mesma etiqueta não pode ser informada mais de uma vez.");

    public static readonly DomainError InvalidTag = new("Service.InvalidTag", "Informe etiquetas válidas.");

    public int Code { get; private set; }
    public string Name { get; private set; }
    public string? Description { get; private set; }
    public int DurationMinutes { get; private set; }
    public int MinDurationMinutes { get; private set; }
    public int MaxDurationMinutes { get; private set; }
    public Money Price { get; private set; }
    public Percentage MaxDiscountPercentage { get; private set; }
    public Guid? CategoryId { get; private set; }

    private readonly List<ServiceTag> _tags = [];
    public IReadOnlyCollection<ServiceTag> Tags => _tags;

    // EF Core materialization only.
    private Service()
    {
        Name = string.Empty;
        Price = null!;
        MaxDiscountPercentage = null!;
    }

    private Service(
        Guid id,
        string name,
        string? description,
        DurationRange duration,
        Money price,
        Percentage maxDiscountPercentage,
        Guid? categoryId,
        int code)
        : base(id)
    {
        Code = code;
        CategoryId = categoryId;
        Name = name;
        Description = description;
        MinDurationMinutes = duration.MinDurationMinutes;
        DurationMinutes = duration.DurationMinutes;
        MaxDurationMinutes = duration.MaxDurationMinutes;
        Price = price;
        MaxDiscountPercentage = maxDiscountPercentage;
    }

    public static DomainResult<Service> Create(
        Guid id,
        string name,
        string? description,
        DurationRange duration,
        Money price,
        Percentage maxDiscountPercentage,
        Guid? categoryId,
        IReadOnlyCollection<Guid> tagIds,
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

        var tagsResult = ValidateTags(tagIds);
        if (tagsResult.IsFailure)
        {
            return DomainResult.Failure<Service>(tagsResult.Error);
        }

        var service = new Service(
            id,
            nameResult.Value,
            descriptionResult.Value,
            duration,
            price,
            maxDiscountPercentage,
            categoryId,
            code);

        service.SyncTags(tagIds);

        return DomainResult.Success(service);
    }

    public DomainResult Update(
        string name,
        string? description,
        DurationRange duration,
        Money price,
        Percentage maxDiscountPercentage,
        Guid? categoryId,
        IReadOnlyCollection<Guid> tagIds)
    {
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

        var tagsResult = ValidateTags(tagIds);
        if (tagsResult.IsFailure)
        {
            return DomainResult.Failure(tagsResult.Error);
        }

        Name = nameResult.Value;
        Description = descriptionResult.Value;
        MinDurationMinutes = duration.MinDurationMinutes;
        DurationMinutes = duration.DurationMinutes;
        MaxDurationMinutes = duration.MaxDurationMinutes;
        Price = price;
        MaxDiscountPercentage = maxDiscountPercentage;
        CategoryId = categoryId;
        SyncTags(tagIds);

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

    private static DomainResult<string?> ValidateDescription(string? description)
    {
        var trimmed = description?.Trim();

        if (string.IsNullOrEmpty(trimmed))
        {
            return DomainResult.Success<string?>(null);
        }

        if (trimmed.Length > DescriptionMaxLength)
        {
            return DomainResult.Failure<string?>(DescriptionTooLong);
        }

        return DomainResult.Success<string?>(trimmed);
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
}
