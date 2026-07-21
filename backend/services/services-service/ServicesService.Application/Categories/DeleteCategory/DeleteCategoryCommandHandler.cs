using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Categories.DeleteCategory;

public sealed class DeleteCategoryCommandHandler : ICommandHandler<DeleteCategoryCommand>
{
    private readonly ICategoryRepository _categoryRepository;
    private readonly IServiceRepository _serviceRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteCategoryCommandHandler(
        ICategoryRepository categoryRepository,
        IServiceRepository serviceRepository,
        IUnitOfWork unitOfWork)
    {
        _categoryRepository = categoryRepository;
        _serviceRepository = serviceRepository;
        _unitOfWork = unitOfWork;
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
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
