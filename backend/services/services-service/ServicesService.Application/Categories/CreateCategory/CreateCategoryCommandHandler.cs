using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories.CreateCategory;

public sealed class CreateCategoryCommandHandler : ICommandHandler<CreateCategoryCommand, CategoryResponse>
{
    private const string NameConstraint = "IX_Categories_TenantId_NameNormalized";

    private readonly ICategoryRepository _categoryRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CreateCategoryCommandHandler> _logger;

    public CreateCategoryCommandHandler(
        ICategoryRepository categoryRepository,
        IUnitOfWork unitOfWork,
        ILogger<CreateCategoryCommandHandler> logger)
    {
        _categoryRepository = categoryRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<CategoryResponse>> Handle(CreateCategoryCommand command, CancellationToken cancellationToken)
    {
        if (await _categoryRepository.NameExistsAsync(command.Name, excludeCategoryId: null, cancellationToken))
        {
            return Result.Failure<CategoryResponse>(
                Error.Conflict("Category.DuplicateName", $"Já existe uma categoria chamada '{command.Name}'."));
        }

        var category = command.ToModel();
        _categoryRepository.Add(category);

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
            "Unrecognized unique constraint {ConstraintName} violated while creating a Category",
            exception.ConstraintName);
        return Error.Conflict(
            "Category.DuplicateConflict",
            "Não foi possível salvar a categoria devido a um conflito de dados.");
    }
}
