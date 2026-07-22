using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories.DeleteCategory;

public sealed class DeleteCategoryCommandHandler : ICommandHandler<DeleteCategoryCommand>
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IServiceRepository _serviceRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeleteCategoryCommandHandler> _logger;

    public DeleteCategoryCommandHandler(
        ICategoryRepository categoryRepository,
        IServiceRepository serviceRepository,
        IUnitOfWork unitOfWork,
        ILogger<DeleteCategoryCommandHandler> logger)
    {
        _categoryRepository = categoryRepository;
        _serviceRepository = serviceRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result> Handle(DeleteCategoryCommand command, CancellationToken cancellationToken)
    {
        var category = await _categoryRepository.GetByIdAsync(command.CategoryId, cancellationToken);
        if (category is null)
        {
            return Result.Failure(
                Error.NotFound("Category.NotFound", $"Categoria '{command.CategoryId}' não foi encontrada."));
        }

        var usageCount = await _serviceRepository.CountByCategoryIdAsync(command.CategoryId, cancellationToken);
        if (usageCount > 0)
        {
            return Result.Failure(
                Error.Conflict(
                    "Category.InUse",
                    $"Esta categoria está em uso por {usageCount} serviço(s) e não pode ser excluída."));
        }

        _categoryRepository.Remove(category);

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure(CategoryPersistenceErrorMapper.Map(saveResult.Error, category.Name, _logger));
        }

        return Result.Success();
    }
}
