using ServicesService.Domain.Common;

namespace ServicesService.Domain.Entities;

// Name uniqueness per tenant is a cross-aggregate rule, enforced in the CreateService/UpdateService use cases via IServiceRepository, mirroring Tag.
// All shape/invariant validation lives in CreateServiceCommandValidator/UpdateServiceCommandValidator (docs/adr/0011) - this entity trusts its inputs.
public class Service : TenantOwnedEntity
{
    public const int NameMaxLength = 100;
    public const int DescriptionMaxLength = 500;
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
        Name = name.Trim();
        Description = NormalizeDescription(description);
        DurationMinutes = durationMinutes;
        MinDurationMinutes = minDurationMinutes;
        MaxDurationMinutes = maxDurationMinutes;
        Price = price;
        MaxDiscountPercentage = maxDiscountPercentage;
        CategoryId = categoryId;
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
        Name = name.Trim();
        Description = NormalizeDescription(description);
        DurationMinutes = durationMinutes;
        MinDurationMinutes = minDurationMinutes;
        MaxDurationMinutes = maxDurationMinutes;
        Price = price;
        MaxDiscountPercentage = maxDiscountPercentage;
        CategoryId = categoryId;
    }

    public void SetTags(IEnumerable<Tag> tags)
    {
        _tags.Clear();
        _tags.AddRange(tags);
    }

    private static string? NormalizeDescription(string? description)
    {
        var trimmed = description?.Trim();
        return string.IsNullOrEmpty(trimmed) ? null : trimmed;
    }
}
