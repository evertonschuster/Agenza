using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services;

public sealed record ServiceResponse(
    Guid Id,
    int Code,
    string Name,
    string? Description,
    int DurationMinutes,
    int MinDurationMinutes,
    int MaxDurationMinutes,
    decimal Price,
    decimal MaxDiscountPercentage,
    Guid? CategoryId,
    string? CategoryName,
    IReadOnlyList<TagSummary> Tags)
{
    public static ServiceResponse FromService(Service service, string? categoryName, IReadOnlyList<Tag> tags)
    {
        return new ServiceResponse(
            service.Id,
            service.Code,
            service.Name,
            service.Description,
            service.DurationMinutes,
            service.MinDurationMinutes,
            service.MaxDurationMinutes,
            service.Price.Value,
            service.MaxDiscountPercentage.Value,
            service.CategoryId,
            categoryName,
            tags.Select(tag => new TagSummary(tag.Id, tag.Name, tag.Color.Value)).ToList());
    }
}

public sealed record TagSummary(Guid Id, string Name, string Color);
