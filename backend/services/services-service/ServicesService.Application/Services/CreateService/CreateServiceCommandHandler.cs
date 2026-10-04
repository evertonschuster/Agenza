using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services.CreateService;

public sealed class CreateServiceCommandHandler(
    IServiceRepository serviceRepository,
    ICategoryRepository categoryRepository,
    ITagRepository tagRepository,
    IServiceCodeGenerator serviceCodeGenerator,
    IUnitOfWork unitOfWork,
    ILogger<CreateServiceCommandHandler> logger) : ICommandHandler<CreateServiceCommand, ServiceResponse>
{
    public async Task<Result<ServiceResponse>> Handle(CreateServiceCommand command, CancellationToken cancellationToken)
    {
        var nameConflict = await FindNameConflictAsync(command.Name, cancellationToken);
        if (nameConflict is { } nameError)
        {
            return Result.Failure<ServiceResponse>(nameError);
        }

        var categoryResult = await FindCategoryAsync(command.CategoryId, cancellationToken);
        if (categoryResult.IsFailure)
        {
            return Result.Failure<ServiceResponse>(categoryResult.Error);
        }

        var tagsResult = await FindTagsAsync(command.TagIds, cancellationToken);
        if (tagsResult.IsFailure)
        {
            return Result.Failure<ServiceResponse>(tagsResult.Error);
        }

        var code = await serviceCodeGenerator.GetNextCodeAsync(cancellationToken);
        var serviceResult = command.ToModel(code);
        if (serviceResult.IsFailure)
        {
            await unitOfWork.RollbackAsync(cancellationToken);
            return Result.Failure<ServiceResponse>(serviceResult.Error.ToApplicationError());
        }

        var service = serviceResult.Value;
        serviceRepository.Add(service);

        var saveResult = await unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            logger.LogWarning(
                "Saving a service failed with {Kind} on {ConstraintName}",
                saveResult.Error.Kind,
                saveResult.Error.ConstraintName);

            return Result.Failure<ServiceResponse>(Error.Conflict(
                "Service.SaveFailed",
                "Não foi possível salvar o serviço. Tente novamente."));
        }

        return ServiceResponse.FromService(service, categoryResult.Value?.Name, tagsResult.Value);
    }

    private async Task<Error?> FindNameConflictAsync(string name, CancellationToken cancellationToken)
    {
        var serviceWithSameName = await serviceRepository.FindByNameAsync(name, cancellationToken);
        if (serviceWithSameName is null)
        {
            return null;
        }

        return Error.Conflict(
            "Service.DuplicateName",
            $"Já existe um serviço chamado '{serviceWithSameName.Name}'.",
            field: nameof(CreateServiceCommand.Name),
            meta: new Dictionary<string, string>
            {
                ["serviceId"] = serviceWithSameName.Id.ToString(),
                ["serviceName"] = serviceWithSameName.Name,
            });
    }

    private async Task<Result<Category?>> FindCategoryAsync(Guid? categoryId, CancellationToken cancellationToken)
    {
        if (categoryId is not { } id)
        {
            return Result.Success<Category?>(null);
        }

        var category = await categoryRepository.GetByIdAsync(id, cancellationToken);
        if (category is null)
        {
            return Result.Failure<Category?>(
                Error.NotFound("Category.NotFound", $"Categoria '{id}' não foi encontrada."));
        }

        return Result.Success<Category?>(category);
    }

    private async Task<Result<IReadOnlyList<Tag>>> FindTagsAsync(
        IReadOnlyList<Guid>? tagIds,
        CancellationToken cancellationToken)
    {
        if (tagIds is not { Count: > 0 })
        {
            return Result.Success<IReadOnlyList<Tag>>([]);
        }

        var tags = await tagRepository.GetByIdsAsync(tagIds, cancellationToken);
        if (tags.Count != tagIds.Distinct().Count())
        {
            return Result.Failure<IReadOnlyList<Tag>>(
                Error.NotFound("Tag.NotFound", "Uma ou mais etiquetas informadas não foram encontradas."));
        }

        return Result.Success(tags);
    }
}
