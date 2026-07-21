using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories.UpdateCategory;

public sealed class UpdateCategoryCommandHandler : ICommandHandler<UpdateCategoryCommand, CategoryResponse>
{
    private const string NameConstraint = "IX_Categories_TenantId_NameNormalized";

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

        command.ApplyTo(category);

        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (DuplicateEntityException ex)
        {
            return Result.Failure<CategoryResponse>(MapDuplicateError(ex, command.Name));
        }

        return CategoryResponse.FromCategory(category);
    }

    private Error MapDuplicateError(DuplicateEntityException exception, string name)
    {
        if (exception.ConstraintName == NameConstraint)
        {
            return Error.Conflict("Category.DuplicateName", $"Já existe uma categoria chamada '{name}'.");
        }

        _logger.LogError(
            exception,
            "Unrecognized unique constraint {ConstraintName} violated while updating a Category",
            exception.ConstraintName);
        return Error.Conflict(
            "Category.DuplicateConflict",
            "Não foi possível salvar a categoria devido a um conflito de dados.");
    }
}
