using ServicesService.Application.Tags;

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
    public static ServiceResponse FromService(Service service, string? categoryName) =>
        new(
            service.Id,
            service.Code,
            service.Name,
            service.Description,
            service.DurationMinutes,
            service.MinDurationMinutes,
            service.MaxDurationMinutes,
            service.Price,
            service.MaxDiscountPercentage,
            service.CategoryId,
            categoryName,
            service.Tags.Select(TagSummary.FromTag).ToList());
}
