using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients.DeactivateClient;

public sealed class DeactivateClientCommandHandler(
    IClientRepository clientRepository,
    IAppointmentRepository appointmentRepository,
    IUnitOfWork unitOfWork) : ICommandHandler<DeactivateClientCommand, ClientResponse>
{
    public async Task<Result<ClientResponse>> Handle(DeactivateClientCommand command, CancellationToken cancellationToken)
    {
        var client = await clientRepository.GetByIdAsync(command.ClientId, cancellationToken);
        if (client is null)
        {
            return Result.Failure<ClientResponse>(Error.NotFound("Client.NotFound", "A pessoa não foi encontrada."));
        }

        if (client.Status == ClientStatus.Inactive)
        {
            return ClientResponse.FromClient(client);
        }

        var upcomingAppointmentConflict = await FindUpcomingAppointmentConflictAsync(client, cancellationToken);
        if (upcomingAppointmentConflict is { } appointmentError)
        {
            return Result.Failure<ClientResponse>(appointmentError);
        }

        var inactivateResult = client.Inactivate();
        if (inactivateResult.IsFailure)
        {
            return Result.Failure<ClientResponse>(inactivateResult.Error.ToApplicationError());
        }

        await clientRepository.UpdateAsync(client, cancellationToken);

        var saveResult = await unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure<ClientResponse>(Error.Conflict(
                "Client.SaveFailed",
                "Não foi possível salvar a pessoa. Tente novamente."));
        }

        return ClientResponse.FromClient(client);
    }

    private async Task<Error?> FindUpcomingAppointmentConflictAsync(Client client, CancellationToken cancellationToken)
    {
        var hasUpcomingAppointments = await appointmentRepository.HasUpcomingAppointmentsAsync(client.Id, cancellationToken);
        if (!hasUpcomingAppointments)
        {
            return null;
        }

        return Error.Conflict(
            "Client.HasUpcomingAppointments",
            "Não é possível desativar esta pessoa porque ela tem agendamentos futuros que não foram cancelados. Resolva esses agendamentos e tente novamente.");
    }
}
