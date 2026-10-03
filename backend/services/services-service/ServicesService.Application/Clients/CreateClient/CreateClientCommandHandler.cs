using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Clients.CreateClient;

public sealed class CreateClientCommandHandler : ICommandHandler<CreateClientCommand, ClientResponse>
{
    private readonly IClientRepository _clientRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<CreateClientCommandHandler> _logger;

    public CreateClientCommandHandler(
        IClientRepository clientRepository,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider,
        ILogger<CreateClientCommandHandler> logger)
    {
        _clientRepository = clientRepository;
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
        _logger = logger;
    }

    public async Task<Result<ClientResponse>> Handle(CreateClientCommand command, CancellationToken cancellationToken)
    {
        var today = DateOnly.FromDateTime(_timeProvider.GetUtcNow().UtcDateTime);
        var clientResult = command.ToModel(today);

        if (clientResult.IsFailure)
        {
            return Result.Failure<ClientResponse>(clientResult.Error.ToApplicationError());
        }

        var client = clientResult!.Value!;

        var cpfMatch = await FindCpfMatchAsync(client, cancellationToken);
        var emailTaken = await IsEmailTakenAsync(client, cancellationToken);

        if (ClientConflicts.From(cpfMatch, emailTaken) is { } conflict)
        {
            return Result.Failure<ClientResponse>(conflict);
        }

        _clientRepository.Add(client);

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            return Result.Failure<ClientResponse>(await MapSaveFailureAsync(client, saveResult.Error, cancellationToken));
        }

        return ClientResponse.FromClient(client);
    }

    private async Task<ClientCpfMatch?> FindCpfMatchAsync(Client client, CancellationToken cancellationToken)
    {
        if (client.Cpf is null)
        {
            return null;
        }

        return await _clientRepository.FindByCpfAsync(client.Cpf, cancellationToken);
    }

    private async Task<bool> IsEmailTakenAsync(Client client, CancellationToken cancellationToken)
    {
        if (client.Email is null)
        {
            return false;
        }

        return await _clientRepository.ActiveEmailExistsAsync(client.Email, cancellationToken);
    }

    // A concurrent request took the CPF after the pre-check; look the winner up so the conflict can still link to it.
    //TODO: Rever como lidar com o erro que vem da base de dados, poderiamos generalizar o tratamento do erro

    private async Task<Error> MapSaveFailureAsync(Client client, PersistenceError error, CancellationToken cancellationToken)
    {
        ClientCpfMatch? cpfMatch = null;
        if (error.ConstraintName == ClientPersistenceErrorMapper.CpfConstraint)
        {
            cpfMatch = await FindCpfMatchAsync(client, cancellationToken);
        }

        return ClientPersistenceErrorMapper.Map(error, cpfMatch, _logger);
    }
}
