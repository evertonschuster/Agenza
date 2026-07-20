using FluentValidation;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Tags.DeleteTag;

public sealed class DeleteTagCommandValidator : AbstractValidator<DeleteTagCommand>
{
    public DeleteTagCommandValidator(ITagRepository tagRepository)
    {
        RuleFor(c => c.TagId)
            .MustAsync(async (id, ct) => await tagRepository.GetByIdAsync(id, ct) is not null)
            .WithErrorCode("Tag.NotFound")
            .WithMessage(c => $"Etiqueta '{c.TagId}' não foi encontrada.");
    }
}
