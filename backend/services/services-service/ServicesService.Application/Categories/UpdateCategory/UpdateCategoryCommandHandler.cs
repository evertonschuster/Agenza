using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories.UpdateCategory;

public sealed class UpdateCategoryCommandHandler : ICommandHandler<UpdateCategoryCommand, CategoryResponse>
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateCategoryCommandHandler(ICategoryRepository categoryRepository, IUnitOfWork unitOfWork)
    {
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<CategoryResponse>> Handle(UpdateCategoryCommand command, CancellationToken cancellationToken)
    {
        // Existence already guaranteed by UpdateCategoryCommandValidator.
        var category = (await _categoryRepository.GetByIdAsync(command.CategoryId, cancellationToken))!;

        command.ApplyTo(category);

        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return CategoryResponse.FromCategory(category);
    }
}
