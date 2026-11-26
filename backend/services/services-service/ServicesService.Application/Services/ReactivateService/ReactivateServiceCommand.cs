using System.ComponentModel;
using Admin.SharedKernel;

namespace ServicesService.Application.Services.ReactivateService;

public sealed record ReactivateServiceCommand(
    [property: Description("ID do serviço a tornar disponível para agendamento novamente, em formato UUID. Use o valor do campo id do serviço.")]
    Guid ServiceId) : ICommand<ServiceResponse>;
