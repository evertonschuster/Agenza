using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.CreateService;

public sealed class CreateServiceCommandHandler : ICommandHandler<CreateServiceCommand, ServiceResponse>
{
    private const string NameConstraint = "IX_Services_TenantId_NameNormalized";
    private const string CodeConstraint = "IX_Services_TenantId_Code";

    private readonly IServiceRepository _serviceRepository;
    private readonly ServiceRelationshipLoader _relationshipLoader;
    private readonly IServiceCodeGenerator _serviceCodeGenerator;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CreateServiceCommandHandler> _logger;

    public CreateServiceCommandHandler(
        IServiceRepository serviceRepository,
        ServiceRelationshipLoader relationshipLoader,
        IServiceCodeGenerator serviceCodeGenerator,
        IUnitOfWork unitOfWork,
        ILogger<CreateServiceCommandHandler> logger)
    {
        _serviceRepository = serviceRepository;
        _relationshipLoader = relationshipLoader;
        _serviceCodeGenerator = serviceCodeGenerator;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<ServiceResponse>> Handle(CreateServiceCommand command, CancellationToken cancellationToken)
    {
        if (await _serviceRepository.NameExistsAsync(command.Name, excludeServiceId: null, cancellationToken))
        {
            return Result.Failure<ServiceResponse>(
                Error.Conflict("Service.DuplicateName", $"Já existe um serviço chamado '{command.Name}'."));
        }

        var relationshipsResult = await _relationshipLoader.LoadAsync(
            command.CategoryId, command.TagIds, cancellationToken);
        if (relationshipsResult.IsFailure)
        {
            return Result.Failure<ServiceResponse>(relationshipsResult.Error);
        }

        var relationships = relationshipsResult.Value;

        // Requested only once existence/duplicate checks passed, so a rejected
        // create doesn't burn a code from the tenant's sequence.
        var code = await _serviceCodeGenerator.GetNextCodeAsync(cancellationToken);
        var service = command.ToModel(code, relationships.Tags);

        _serviceRepository.Add(service);

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
                    "Unrecognized unique constraint {ConstraintName} violated while creating a Service",
                    exception.ConstraintName);
                return Error.Conflict(
                    "Service.DuplicateConflict",
                    "Não foi possível salvar o serviço devido a um conflito de dados.");
        }
    }
}
