using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.UpdateService;

public sealed class UpdateServiceCommandHandler : ICommandHandler<UpdateServiceCommand, ServiceResponse>
{
    private const string NameConstraint = "IX_Services_TenantId_NameNormalized";
    private const string CodeConstraint = "IX_Services_TenantId_Code";

    private readonly IServiceRepository _serviceRepository;
    private readonly ServiceRelationshipLoader _relationshipLoader;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UpdateServiceCommandHandler> _logger;

    public UpdateServiceCommandHandler(
        IServiceRepository serviceRepository,
        ServiceRelationshipLoader relationshipLoader,
        IUnitOfWork unitOfWork,
        ILogger<UpdateServiceCommandHandler> logger)
    {
        _serviceRepository = serviceRepository;
        _relationshipLoader = relationshipLoader;
        _unitOfWork = unitOfWork;
        _logger = logger;
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
        catch (DuplicateEntityException ex)
        {
            return Result.Failure<ServiceResponse>(MapDuplicateError(ex, command.Name));
        }

        return ServiceResponse.FromService(service, relationships.Category?.Name);
    }

    private Error MapDuplicateError(DuplicateEntityException exception, string name)
    {
        switch (exception.ConstraintName)
        {
            case NameConstraint:
                return Error.Conflict("Service.DuplicateName", $"Já existe um serviço chamado '{name}'.");
            case CodeConstraint:
                return Error.Conflict(
                    "Service.DuplicateCode",
                    "O código gerado para o serviço já está em uso. Tente novamente.");
            default:
                _logger.LogError(
                    exception,
                    "Unrecognized unique constraint {ConstraintName} violated while updating a Service",
                    exception.ConstraintName);
                return Error.Conflict(
                    "Service.DuplicateConflict",
                    "Não foi possível salvar o serviço devido a um conflito de dados.");
        }
    }
}
