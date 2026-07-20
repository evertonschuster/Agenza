using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.CreateService;

public sealed class CreateServiceCommandHandler : ICommandHandler<CreateServiceCommand, ServiceResponse>
{
    private readonly IServiceRepository _serviceRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly ITagRepository _tagRepository;
    private readonly IServiceCodeGenerator _serviceCodeGenerator;
    private readonly IUnitOfWork _unitOfWork;

    public CreateServiceCommandHandler(
        IServiceRepository serviceRepository,
        ICategoryRepository categoryRepository,
        ITagRepository tagRepository,
        IServiceCodeGenerator serviceCodeGenerator,
        IUnitOfWork unitOfWork)
    {
        _serviceRepository = serviceRepository;
        _categoryRepository = categoryRepository;
        _tagRepository = tagRepository;
        _serviceCodeGenerator = serviceCodeGenerator;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ServiceResponse>> Handle(CreateServiceCommand command, CancellationToken cancellationToken)
    {
        var code = await _serviceCodeGenerator.GetNextCodeAsync(cancellationToken);
        var tags = command.TagIds is { Count: > 0 }
            ? await _tagRepository.GetByIdsAsync(command.TagIds, cancellationToken)
            : [];
        var service = command.ToModel(code, tags);

        _serviceRepository.Add(service);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // Existence already guaranteed by CreateServiceCommandValidator.
        var categoryName = command.CategoryId is { } categoryId
            ? (await _categoryRepository.GetByIdAsync(categoryId, cancellationToken))?.Name
            : null;

        return ServiceResponse.FromService(service, categoryName);
    }
}
