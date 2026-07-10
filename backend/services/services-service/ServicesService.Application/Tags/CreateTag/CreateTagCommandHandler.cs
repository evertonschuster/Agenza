using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.CreateTag;

public sealed class CreateTagCommandHandler : ICommandHandler<CreateTagCommand, TagResponse>
{
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentTenantProvider _currentTenant;

    public CreateTagCommandHandler(
        ITagRepository tagRepository,
        IUnitOfWork unitOfWork,
        ICurrentTenantProvider currentTenant)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
        _currentTenant = currentTenant;
    }

    public async Task<Result<TagResponse>> Handle(CreateTagCommand command, CancellationToken cancellationToken)
    {
        var tag = command.ToModel(_currentTenant.TenantId);

        if (await _tagRepository.NameExistsAsync(tag.Name, excludeTagId: null, cancellationToken))
        {
            return Result.Failure<TagResponse>(
                Error.Conflict("Tag.DuplicateName", $"A tag named '{tag.Name}' already exists."));
        }

        _tagRepository.Add(tag);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return TagResponse.FromTag(tag);
    }
}
