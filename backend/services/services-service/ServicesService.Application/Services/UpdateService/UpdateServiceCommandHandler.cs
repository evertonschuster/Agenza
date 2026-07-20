using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.UpdateService;

public sealed class UpdateServiceCommandHandler : ICommandHandler<UpdateServiceCommand, ServiceResponse>
{
    private readonly IServiceRepository _serviceRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;

    public UpdateServiceCommandHandler(
        IServiceRepository serviceRepository,
        ICategoryRepository categoryRepository,
        ITagRepository tagRepository,
        IUnitOfWork unitOfWork)
    {
        _serviceRepository = serviceRepository;
        _categoryRepository = categoryRepository;
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<ServiceResponse>> Handle(UpdateServiceCommand command, CancellationToken cancellationToken)
    {
        // Existence already guaranteed by UpdateServiceCommandValidator.
        var service = (await _serviceRepository.GetByIdAsync(command.ServiceId, cancellationToken))!;

        if (command.TagIds is not null)
        {
            service.SetTags(await _tagRepository.GetByIdsAsync(command.TagIds, cancellationToken));
        }

        command.ApplyTo(service);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        var categoryName = command.CategoryId is { } categoryId
            ? (await _categoryRepository.GetByIdAsync(categoryId, cancellationToken))?.Name
            : null;

        return ServiceResponse.FromService(service, categoryName);
    }
}
