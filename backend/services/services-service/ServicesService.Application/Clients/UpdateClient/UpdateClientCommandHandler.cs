using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Clients.UpdateClient;

public sealed class UpdateClientCommandHandler(
    IClientRepository clientRepository,
    IUnitOfWork unitOfWork,
    TimeProvider timeProvider,
    ILogger<UpdateClientCommandHandler> logger) : ICommandHandler<UpdateClientCommand, ClientResponse>
{
    public async Task<Result<ClientResponse>> Handle(UpdateClientCommand command, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime);

        var client = await clientRepository.GetForUpdateAsync(command.ClientId, cancellationToken);
        if (client is null)
        {
            return Result.Failure<ClientResponse>(Error.NotFound("Client.NotFound", "A pessoa não foi encontrada."));
        }

        var applyResult = command.ApplyTo(client, today);
        if (applyResult.IsFailure)
        {
            return Result.Failure<ClientResponse>(ToError(applyResult.Error));
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
