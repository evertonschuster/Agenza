using Admin.SharedKernel;
using ServicesService.Application.Abstractions;

namespace ServicesService.Application.Clients.ReactivateClient;

public sealed class ReactivateClientCommandHandler(
    IClientRepository clientRepository,
    IUnitOfWork unitOfWork) : ICommandHandler<ReactivateClientCommand, ClientResponse>
{
    public async Task<Result<ClientResponse>> Handle(ReactivateClientCommand command, CancellationToken cancellationToken)
    {
        var client = await clientRepository.GetByIdAsync(command.ClientId, cancellationToken);
        if (client is null)
        {
            return Result.Failure<ClientResponse>(Error.NotFound("Client.NotFound", "A pessoa não foi encontrada."));
        }

        if (client.Status == ClientStatus.Active)
        {
            return ClientResponse.FromClient(client);
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

        var reactivateResult = client.Reactivate();
        if (reactivateResult.IsFailure)
        {
            return Result.Failure<ClientResponse>(reactivateResult.Error.ToApplicationError());
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
            "Não é possível reativar esta pessoa porque outra pessoa já usa este CPF. Corrija o CPF deste cadastro e tente novamente.",
            field: "Cpf",
            meta: ExistingClientMeta(otherClientWithSameCpf));
    }

    private async Task<Error?> FindEmailConflictAsync(Client client, CancellationToken cancellationToken)
    {
        if (client.Email is null)
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
            "Não é possível reativar esta pessoa porque outra pessoa ativa já usa este e-mail. Corrija o e-mail deste cadastro e tente novamente.",
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
