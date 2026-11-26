using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Services.DeactivateService;

public sealed record DeactivateServiceCommand(
    [property: Description("ID do serviço a tornar indisponível para agendamento, em formato UUID. Use o valor do campo id do serviço.")]
    Guid ServiceId) : ICommand<ServiceResponse>;
