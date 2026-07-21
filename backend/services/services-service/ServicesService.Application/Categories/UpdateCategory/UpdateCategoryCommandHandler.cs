using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories.UpdateCategory;

public sealed class UpdateCategoryCommandHandler : ICommandHandler<UpdateCategoryCommand, CategoryResponse>
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UpdateCategoryCommandHandler> _logger;

    public UpdateCategoryCommandHandler(
        ICategoryRepository categoryRepository,
        IUnitOfWork unitOfWork,
        ILogger<UpdateCategoryCommandHandler> logger)
    {
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
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

        var applyResult = command.ApplyTo(category);
        if (applyResult.IsFailure)
        {
            return Result.Failure<CategoryResponse>(applyResult.Error.ToApplicationError());
        }

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure<CategoryResponse>(
                CategoryPersistenceErrorMapper.Map(saveResult.Error, command.Name, _logger));
        }

        return CategoryResponse.FromCategory(category);
    }
}
