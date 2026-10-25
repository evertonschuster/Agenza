using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients.DeleteClient;

public sealed class DeleteClientCommandHandler(
    IClientRepository clientRepository,
    IAppointmentRepository appointmentRepository,
    IUnitOfWork unitOfWork) : ICommandHandler<DeleteClientCommand>
{
    public async Task<Result> Handle(DeleteClientCommand command, CancellationToken cancellationToken)
    {
        var client = await clientRepository.GetByIdAsync(command.ClientId, cancellationToken);
        if (client is null)
        {
            return Result.Failure(Error.NotFound("Client.NotFound", "A pessoa não foi encontrada."));
        }

        var appointmentConflict = await FindAppointmentConflictAsync(client, cancellationToken);
        if (appointmentConflict is { } appointmentError)
        {
            return Result.Failure(appointmentError);
        }

        clientRepository.Remove(client);

        var saveResult = await unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure(Error.Conflict(
                "Client.SaveFailed",
                "Não foi possível salvar a pessoa. Tente novamente."));
        }

        return Result.Success();
    }

    private async Task<Error?> FindAppointmentConflictAsync(Client client, CancellationToken cancellationToken)
    {
        var hasAppointments = await appointmentRepository.HasAppointmentsAsync(client.Id, cancellationToken);
        if (!hasAppointments)
        {
            return null;
        }

        return Error.Conflict(
            "Client.HasAppointments",
            "Não é possível excluir esta pessoa porque ela tem agendamentos registrados, inclusive passados ou cancelados. Se ela não for mais atendida, desative o cadastro.");
    }
}
