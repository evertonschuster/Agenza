using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Categories.UpdateCategory;

public static class UpdateCategoryCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateCategoryCommand command, Category category) =>
        category.Update(command.Name);
}
