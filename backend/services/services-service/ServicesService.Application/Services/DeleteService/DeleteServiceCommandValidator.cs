using FluentValidation;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Services.DeleteService;

public sealed class DeleteServiceCommandValidator : AbstractValidator<DeleteServiceCommand>
{
    public DeleteServiceCommandValidator(IServiceRepository serviceRepository)
    {
        RuleFor(c => c.ServiceId)
            .MustAsync(async (id, ct) => await serviceRepository.GetByIdAsync(id, ct) is not null)
            .WithErrorCode("Service.NotFound")
            .WithMessage(c => $"Serviço '{c.ServiceId}' não foi encontrado.");
    }
}
