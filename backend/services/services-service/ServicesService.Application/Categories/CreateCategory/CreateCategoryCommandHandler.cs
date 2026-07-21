using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories.CreateCategory;

public sealed class CreateCategoryCommandHandler : ICommandHandler<CreateCategoryCommand, CategoryResponse>
{
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

        var categoryResult = command.ToModel();
        if (categoryResult.IsFailure)
        {
            return Result.Failure<CategoryResponse>(categoryResult.Error.ToApplicationError());
        }

        var category = categoryResult.Value;
        _categoryRepository.Add(category);

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure<CategoryResponse>(
                CategoryPersistenceErrorMapper.Map(saveResult.Error, command.Name, _logger));
        }

        return CategoryResponse.FromCategory(category);
    }
}
