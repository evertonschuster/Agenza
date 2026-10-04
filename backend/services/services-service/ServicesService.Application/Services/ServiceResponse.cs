using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services;

public sealed record ServiceResponse(
    Guid Id,
    int Code,
    string Name,
    Guid? CategoryId,
    string? CategoryName,
    IReadOnlyList<TagSummary> Tags,
    string? InternalDescription,
    string? ClientDescription,
    int DurationMinutes,
    int PreparationMinutes,
    int CleanupMinutes,
    int TotalDurationMinutes,
    int? MinDurationMinutes,
    int? MaxDurationMinutes,
    string PricingType,
    decimal? Price,
    decimal? MaxDiscountPercentage,
    string Status)
{
    public static ServiceResponse FromService(Service service, string? categoryName, IReadOnlyList<Tag> tags)
    {
        return new ServiceResponse(
            service.Id,
            service.Code,
            service.Name,
            service.CategoryId,
            categoryName,
            tags.Select(tag => new TagSummary(tag.Id, tag.Name, tag.Color.Value)).ToList(),
            service.InternalDescription,
            service.ClientDescription,
            service.DurationMinutes,
            service.PreparationMinutes,
            service.CleanupMinutes,
            service.TotalDurationMinutes,
            service.MinDurationMinutes,
            service.MaxDurationMinutes,
            PricingTypeNames.ToName(service.PricingType),
            service.Price?.Value,
            service.MaxDiscountPercentage?.Value,
            ServiceStatusNames.ToName(service.Status));
    }
}

public sealed record TagSummary(Guid Id, string Name, string Color);
