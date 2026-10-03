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

        var cpfConflict = await FindCpfConflictAsync(client, cancellationToken);
        var emailConflict = await FindEmailConflictAsync(client, cancellationToken);

        if (Error.Combine(cpfConflict, emailConflict) is { } conflict)
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

    private async Task<Error?> FindCpfConflictAsync(Client client, CancellationToken cancellationToken)
    {
        if (client.Cpf is null)
        {
            return null;
        }

        var clientWithSameCpf = await _clientRepository.FindByCpfAsync(client.Cpf, cancellationToken);
        if (clientWithSameCpf is null)
        {
            return null;
        }

        return ClientConflicts.Cpf(clientWithSameCpf);
    }

    private async Task<Error?> FindEmailConflictAsync(Client client, CancellationToken cancellationToken)
    {
        if (client.Email is null)
        {
            return null;
        }

        var activeClientWithSameEmail = await _clientRepository.FindActiveByEmailAsync(client.Email, cancellationToken);
        if (activeClientWithSameEmail is null)
        {
            return null;
        }

        return ClientConflicts.Email();
    }

    // A concurrent request took the CPF after the pre-check; look the winner up so the conflict can still link to it.
    //TODO: Rever como lidar com o erro que vem da base de dados, poderiamos generalizar o tratamento do erro

    private async Task<Error> MapSaveFailureAsync(Client client, PersistenceError error, CancellationToken cancellationToken)
    {
        if (error.ConstraintName == ClientPersistenceErrorMapper.CpfConstraint)
        {
            var cpfConflict = await FindCpfConflictAsync(client, cancellationToken);
            if (cpfConflict is not null)
            {
                return cpfConflict.Value;
            }
        }

        return ClientPersistenceErrorMapper.Map(error, _logger);
    }
}
