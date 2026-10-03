using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Clients.CreateClient;

public sealed class CreateClientCommandHandler(
    IClientRepository clientRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider) : ICommandHandler<CreateClientCommand, ClientResponse>
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
        var emailConflict = await FindEmailConflictAsync(client, cancellationToken);

        if (Error.Combine(cpfConflict, emailConflict) is { } conflict)
        {
            return Result.Failure<ClientResponse>(conflict);
        }

        clientRepository.Add(client);

        var saveResult = await unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
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

        // A deleted client cannot be opened, so only a live one carries the id the UI links to.
        if (clientWithSameCpf.IsDeleted)
        {
            return Error.Conflict(
                "Client.DuplicateCpf",
                "Este CPF pertence a um cadastro excluído e não pode ser usado em um novo cadastro.",
                field: "Cpf");
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

    private static Dictionary<string, string> ExistingClientMeta(ClientMatch existing)
    {
        return new Dictionary<string, string>
        {
            ["clientId"] = existing.Id.ToString(),
            ["clientName"] = existing.FullName.Value,
        };
    }
}
