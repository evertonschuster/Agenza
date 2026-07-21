using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.UpdateService;

public sealed class UpdateServiceCommandHandler : ICommandHandler<UpdateServiceCommand, ServiceResponse>
{
    private readonly IServiceRepository _serviceRepository;
    private readonly ServiceRelationshipLoader _relationshipLoader;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateServiceCommandHandler(
        IServiceRepository serviceRepository,
        ServiceRelationshipLoader relationshipLoader,
        IUnitOfWork unitOfWork)
    {
        _serviceRepository = serviceRepository;
        _relationshipLoader = relationshipLoader;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ServiceResponse>> Handle(UpdateServiceCommand command, CancellationToken cancellationToken)
    {
        var service = await _serviceRepository.GetByIdAsync(command.ServiceId, cancellationToken);
        if (service is null)
        {
            return Result.Failure<ServiceResponse>(
                Error.NotFound("Service.NotFound", $"Serviço '{command.ServiceId}' não foi encontrado."));
        }

        if (await _serviceRepository.NameExistsAsync(command.Name, command.ServiceId, cancellationToken))
        {
            return Result.Failure<ServiceResponse>(
                Error.Conflict("Service.DuplicateName", $"Já existe um serviço chamado '{command.Name}'."));
        }

        // TagIds is not null (not Count: > 0) so an explicitly empty array clears a
        // service's tags while null leaves them untouched.
        var relationshipsResult = await _relationshipLoader.LoadAsync(
            command.CategoryId, command.TagIds, cancellationToken);
        if (relationshipsResult.IsFailure)
        {
            return Result.Failure<ServiceResponse>(relationshipsResult.Error);
        }

        var relationships = relationshipsResult.Value;
        if (command.TagIds is not null)
        {
            service.SetTags(relationships.Tags);
        }

        command.ApplyTo(service);

        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (DuplicateEntityException)
        {
            return Result.Failure<ServiceResponse>(
                Error.Conflict("Service.DuplicateName", $"Já existe um serviço chamado '{command.Name}'."));
        }

        return ServiceResponse.FromService(service, relationships.Category?.Name);
    }
}
