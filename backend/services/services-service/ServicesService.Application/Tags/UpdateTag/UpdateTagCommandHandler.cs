using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.UpdateTag;

public sealed class UpdateTagCommandHandler : ICommandHandler<UpdateTagCommand, TagResponse>
{
    private const string NameConstraint = "IX_Tags_TenantId_NameNormalized";

    private readonly ITagRepository _tagRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UpdateTagCommandHandler> _logger;

    public UpdateTagCommandHandler(
        ITagRepository tagRepository,
        IUnitOfWork unitOfWork,
        ILogger<UpdateTagCommandHandler> logger)
    {
        _tagRepository = tagRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result<TagResponse>> Handle(UpdateTagCommand command, CancellationToken cancellationToken)
    {
        var tag = await _tagRepository.GetByIdAsync(command.TagId, cancellationToken);
        if (tag is null)
        {
            return Result.Failure<TagResponse>(
                Error.NotFound("Tag.NotFound", $"Etiqueta '{command.TagId}' não foi encontrada."));
        }

        if (await _tagRepository.NameExistsAsync(command.Name, command.TagId, cancellationToken))
        {
            return Result.Failure<TagResponse>(
                Error.Conflict("Tag.DuplicateName", $"Já existe uma etiqueta chamada '{command.Name}'."));
        }

        command.ApplyTo(tag);

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
            "Unrecognized unique constraint {ConstraintName} violated while updating a Tag",
            exception.ConstraintName);
        return Error.Conflict(
            "Tag.DuplicateConflict",
            "Não foi possível salvar a etiqueta devido a um conflito de dados.");
    }
}
