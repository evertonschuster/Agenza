using ServicesService.Domain.Entities;

namespace ServicesService.Application.Categories.UpdateCategory;

public static class UpdateCategoryCommandExtensions
{
    public static void ApplyTo(this UpdateCategoryCommand command, Category category) =>
        category.Update(command.Name);
}
