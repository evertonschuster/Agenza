using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services.UpdateService;

public sealed class UpdateServiceCommandHandler(
    IServiceRepository serviceRepository,
    ICategoryRepository categoryRepository,
    ITagRepository tagRepository,
    IUnitOfWork unitOfWork,
    ILogger<UpdateServiceCommandHandler> logger) : ICommandHandler<UpdateServiceCommand, ServiceResponse>
{
    public async Task<Result<ServiceResponse>> Handle(UpdateServiceCommand command, CancellationToken cancellationToken)
    {
        var service = await serviceRepository.GetByIdAsync(command.ServiceId, cancellationToken);
        if (service is null)
        {
            return Result.Failure<ServiceResponse>(
                Error.NotFound("Service.NotFound", $"Serviço '{command.ServiceId}' não foi encontrado."));
        }

        var nameConflict = await FindNameConflictAsync(command, cancellationToken);
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

        var applyResult = command.ApplyTo(service);
        if (applyResult.IsFailure)
        {
            return Result.Failure<ServiceResponse>(applyResult.Error.ToApplicationError());
        }

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

    private async Task<Error?> FindNameConflictAsync(UpdateServiceCommand command, CancellationToken cancellationToken)
    {
        var serviceWithSameName = await serviceRepository.FindByNameAsync(command.Name, cancellationToken);
        if (serviceWithSameName is null || serviceWithSameName.Id == command.ServiceId)
        {
            return null;
        }

        return Error.Conflict(
            "Service.DuplicateName",
            $"Já existe um serviço chamado '{serviceWithSameName.Name}'.",
            field: nameof(UpdateServiceCommand.Name),
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
