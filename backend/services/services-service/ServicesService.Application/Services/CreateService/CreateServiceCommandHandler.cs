using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.CreateService;

public sealed class CreateServiceCommandHandler : ICommandHandler<CreateServiceCommand, ServiceResponse>
{
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
        var serviceResult = command.ToModel(code, relationships.Tags);
        if (serviceResult.IsFailure)
        {
            return Result.Failure<ServiceResponse>(serviceResult.Error.ToApplicationError());
        }

        var service = serviceResult.Value;
        _serviceRepository.Add(service);

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure<ServiceResponse>(
                ServicePersistenceErrorMapper.Map(saveResult.Error, command.Name, _logger));
        }

        return ServiceResponse.FromService(service, relationships.Category?.Name);
    }
}
