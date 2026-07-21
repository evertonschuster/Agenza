using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.CreateService;

public sealed class CreateServiceCommandHandler : ICommandHandler<CreateServiceCommand, ServiceResponse>
{
    private readonly IServiceRepository _serviceRepository;
    private readonly ServiceRelationshipLoader _relationshipLoader;
    private readonly IServiceCodeGenerator _serviceCodeGenerator;
    private readonly IUnitOfWork _unitOfWork;

    public CreateServiceCommandHandler(
        IServiceRepository serviceRepository,
        ServiceRelationshipLoader relationshipLoader,
        IServiceCodeGenerator serviceCodeGenerator,
        IUnitOfWork unitOfWork)
    {
        _serviceRepository = serviceRepository;
        _relationshipLoader = relationshipLoader;
        _serviceCodeGenerator = serviceCodeGenerator;
        _unitOfWork = unitOfWork;
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
        catch (DuplicateEntityException)
        {
            return Result.Failure<ServiceResponse>(
                Error.Conflict("Service.DuplicateName", $"Já existe um serviço chamado '{command.Name}'."));
        }

        return ServiceResponse.FromService(service, relationships.Category?.Name);
    }
}
