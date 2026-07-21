using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.CreateTag;

public sealed class CreateTagCommandHandler : ICommandHandler<CreateTagCommand, TagResponse>
{
    private const string NameConstraint = "IX_Tags_TenantId_NameNormalized";

    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<CreateTagCommandHandler> _logger;

    public CreateTagCommandHandler(
        ITagRepository tagRepository,
        IUnitOfWork unitOfWork,
        ILogger<CreateTagCommandHandler> logger)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<TagResponse>> Handle(CreateTagCommand command, CancellationToken cancellationToken)
    {
        if (await _tagRepository.NameExistsAsync(command.Name, excludeTagId: null, cancellationToken))
        {
            return Result.Failure<TagResponse>(
                Error.Conflict("Tag.DuplicateName", $"Já existe uma etiqueta chamada '{command.Name}'."));
        }

        var tag = command.ToModel();
        _tagRepository.Add(tag);

        try
        {
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        catch (DuplicateEntityException ex)
        {
            return Result.Failure<TagResponse>(MapDuplicateError(ex, command.Name));
        }

        return TagResponse.FromTag(tag);
    }

    private Error MapDuplicateError(DuplicateEntityException exception, string name)
    {
        if (exception.ConstraintName == NameConstraint)
        {
            return Error.Conflict("Tag.DuplicateName", $"Já existe uma etiqueta chamada '{name}'.");
        }

        _logger.LogError(
            exception,
            "Unrecognized unique constraint {ConstraintName} violated while creating a Tag",
            exception.ConstraintName);
        return Error.Conflict(
            "Tag.DuplicateConflict",
            "Não foi possível salvar a etiqueta devido a um conflito de dados.");
    }
}
