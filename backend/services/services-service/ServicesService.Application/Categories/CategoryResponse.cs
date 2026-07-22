using ServicesService.Domain.Entities;

namespace ServicesService.Application.Categories;

public sealed record CategoryResponse(Guid Id, string Name)
{
    public static CategoryResponse FromCategory(Category category) => new(category.Id, category.Name);
}
