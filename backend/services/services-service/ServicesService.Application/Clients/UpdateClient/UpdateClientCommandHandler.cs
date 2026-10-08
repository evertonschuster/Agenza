using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients.UpdateClient;

public sealed class UpdateClientCommandHandler(
    IClientRepository clientRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : ICommandHandler<UpdateClientCommand, ClientResponse>
{
    public async Task<Result<ClientResponse>> Handle(UpdateClientCommand command, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

        var client = await clientRepository.GetByIdAsync(command.ClientId, cancellationToken);
        if (client is null)
        {
            return Result.Failure<ClientResponse>(Error.NotFound("Client.NotFound", "A pessoa não foi encontrada."));
        }

        var clientData = command.ToClientData();
        var updateResult = client.Update(clientData, today);
        if (updateResult.IsFailure)
        {
            return Result.Failure<ClientResponse>(ToError(updateResult.Error));
        }

        var cpfConflict = await FindCpfConflictAsync(client, cancellationToken);
        if (cpfConflict is { } cpfError)
        {
            return Result.Failure<ClientResponse>(cpfError);
        }

        var emailConflict = await FindEmailConflictAsync(client, cancellationToken);
        if (emailConflict is { } emailError)
        {
            return Result.Failure<ClientResponse>(emailError);
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

    private static Error ToError(DomainError error)
    {
        return error.ToApplicationError();
    }

    private async Task<Error?> FindCpfConflictAsync(Client client, CancellationToken cancellationToken)
    {
        if (client.Cpf is null)
        {
            return null;
        }

        var otherClientWithSameCpf = await clientRepository.FindByCpfAsync(client.Cpf, client.Id, cancellationToken);
        if (otherClientWithSameCpf is null)
        {
            return null;
        }

        return Error.Conflict(
            "Client.DuplicateCpf",
            "Já existe uma pessoa cadastrada com este CPF.",
            field: "Cpf",
            meta: ExistingClientMeta(otherClientWithSameCpf));
    }

    private async Task<Error?> FindEmailConflictAsync(Client client, CancellationToken cancellationToken)
    {
        if (client.Email is null || client.Status != ClientStatus.Active)
        {
            return null;
        }

        var otherActiveClientWithSameEmail = await clientRepository.FindActiveByEmailAsync(
            client.Email,
            client.Id,
            cancellationToken);
        if (otherActiveClientWithSameEmail is null)
        {
            return null;
        }

        return Error.Conflict(
            "Client.DuplicateEmail",
            "Já existe uma pessoa ativa cadastrada com este e-mail.",
            field: "Email",
            meta: ExistingClientMeta(otherActiveClientWithSameEmail));
    }

    private static Dictionary<string, string> ExistingClientMeta(Client existing)
    {
        return new Dictionary<string, string>
        {
            ["clientId"] = existing.Id.ToString(),
            ["clientName"] = existing.FullName.Value,
        };
    }
}
