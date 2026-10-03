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
        var clientResult = command.ToModel(DateOnly.FromDateTime(_timeProvider.GetUtcNow().UtcDateTime));
        if (clientResult.IsFailure)
        {
            return Result.Failure<ClientResponse>(clientResult.Error.ToApplicationError());
        }

        var client = clientResult.Value;

        var conflict = await FindConflictAsync(client, cancellationToken);
        if (conflict is { } error)
        {
            return Result.Failure<ClientResponse>(error);
        }

        _clientRepository.Add(client);

        var saveResult = await _unitOfWork.SaveChangesAsync(cancellationToken);
        if (saveResult.IsFailure)
        {
            var cpfMatch = saveResult.Error.ConstraintName == ClientPersistenceErrorMapper.CpfConstraint
                && client.Cpf is not null
                    ? await _clientRepository.FindByCpfAsync(client.Cpf, cancellationToken)
                    : null;

            return Result.Failure<ClientResponse>(
                ClientPersistenceErrorMapper.Map(saveResult.Error, cpfMatch, _logger));
        }

        return ClientResponse.FromClient(client);
    }

    private async Task<Error?> FindConflictAsync(Client client, CancellationToken cancellationToken)
    {
        var conflicts = new Dictionary<string, IReadOnlyList<FieldError>>();

        if (client.Cpf is not null
            && await _clientRepository.FindByCpfAsync(client.Cpf, cancellationToken) is { } cpfMatch)
        {
            conflicts[ClientConflicts.CpfField] = [ClientConflicts.DuplicateCpf(cpfMatch)];
        }

        if (client.Email is not null
            && await _clientRepository.ActiveEmailExistsAsync(client.Email, cancellationToken))
        {
            conflicts[ClientConflicts.EmailField] = [ClientConflicts.DuplicateEmail()];
        }

        return conflicts.Count == 0 ? null : ClientConflicts.ToError(conflicts);
    }
}
