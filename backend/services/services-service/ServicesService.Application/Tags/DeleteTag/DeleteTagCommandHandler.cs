using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.DeleteTag;

public sealed class DeleteTagCommandHandler : ICommandHandler<DeleteTagCommand>
{
    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteTagCommandHandler(ITagRepository tagRepository, IUnitOfWork unitOfWork)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result> Handle(DeleteTagCommand command, CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetByIdAsync(command.TagId, cancellationToken);
        if (tag is null)
        {
            return Result.Failure(Error.NotFound("Tag.NotFound", $"Etiqueta '{command.TagId}' não foi encontrada."));
        }

        _tagRepository.Remove(tag);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
