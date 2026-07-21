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
        var category = await _categoryRepository.GetByIdAsync(command.CategoryId, cancellationToken);
        if (category is null)
        {
            return Result.Failure<CategoryResponse>(
                Error.NotFound("Category.NotFound", $"Categoria '{command.CategoryId}' não foi encontrada."));
        }

        if (await _categoryRepository.NameExistsAsync(command.Name, command.CategoryId, cancellationToken))
        {
            return Result.Failure<CategoryResponse>(
                Error.Conflict("Category.DuplicateName", $"Já existe uma categoria chamada '{command.Name}'."));
        }

        command.ApplyTo(category);

        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (DuplicateEntityException)
        {
            return Result.Failure<CategoryResponse>(
                Error.Conflict("Category.DuplicateName", $"Já existe uma categoria chamada '{command.Name}'."));
        }

        return CategoryResponse.FromCategory(category);
    }
}
