using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients.CreateClient;

public sealed class CreateClientCommandHandler(
    IClientRepository clientRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    ILogger<CreateClientCommandHandler> logger) : ICommandHandler<CreateClientCommand, ClientResponse>
{
    public async Task<Result<ClientResponse>> Handle(CreateClientCommand command, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);
        var clientResult = command.ToModel(today);

        if (clientResult.IsFailure)
        {
            return Result.Failure<ClientResponse>(clientResult.Error.ToApplicationError());
        }

        var client = clientResult!.Value!;

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

        clientRepository.Add(client);

        var saveResult = await unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            logger.LogWarning(
                "Saving a client failed with {Kind} on {ConstraintName}",
                saveResult.Error.Kind,
                saveResult.Error.ConstraintName);

            return Result.Failure<ClientResponse>(Error.Conflict(
                "Client.SaveFailed",
                "Não foi possível salvar a pessoa. Tente novamente."));
        }

        return ClientResponse.FromClient(client);
    }

    private async Task<Error?> FindCpfConflictAsync(Client client, CancellationToken cancellationToken)
    {
        if (client.Cpf is null)
        {
            return null;
        }

        var clientWithSameCpf = await clientRepository.FindByCpfAsync(client.Cpf, cancellationToken);
        if (clientWithSameCpf is null)
        {
            return null;
        }

        return Error.Conflict(
            "Client.DuplicateCpf",
            "Já existe uma pessoa cadastrada com este CPF.",
            field: "Cpf",
            meta: ExistingClientMeta(clientWithSameCpf));
    }

    private async Task<Error?> FindEmailConflictAsync(Client client, CancellationToken cancellationToken)
    {
        if (client.Email is null)
        {
            return null;
        }

        var activeClientWithSameEmail = await clientRepository.FindActiveByEmailAsync(client.Email, cancellationToken);
        if (activeClientWithSameEmail is null)
        {
            return null;
        }

        return Error.Conflict(
            "Client.DuplicateEmail",
            "Já existe uma pessoa ativa cadastrada com este e-mail.",
            field: "Email",
            meta: ExistingClientMeta(activeClientWithSameEmail));
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
