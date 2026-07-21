using FluentValidation;
using FluentValidation.Results;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.DeleteTag;

public sealed class DeleteTagCommandValidator : AbstractValidator<DeleteTagCommand>
{
    public DeleteTagCommandValidator(ITagRepository tagRepository, IServiceRepository serviceRepository)
    {
        RuleFor(c => c.TagId)
            .MustAsync(async (id, ct) => await tagRepository.GetByIdAsync(id, ct) is not null)
            .WithErrorCode("Tag.NotFound")
            .WithMessage(c => $"Etiqueta '{c.TagId}' não foi encontrada.");

        RuleFor(c => c.TagId).CustomAsync(async (id, context, ct) =>
        {
            var count = await serviceRepository.CountByTagIdAsync(id, ct);
            if (count > 0)
            {
                context.AddFailure(new ValidationFailure(
                    nameof(DeleteTagCommand.TagId),
                    $"Esta etiqueta está em uso por {count} serviço(s) e não pode ser excluída.")
                {
                    ErrorCode = "Tag.InUse",
                });
            }
        });
    }
}
