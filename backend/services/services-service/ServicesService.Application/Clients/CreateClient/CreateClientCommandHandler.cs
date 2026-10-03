using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;

namespace ServicesService.Application.Clients.CreateClient;

public sealed class CreateClientCommandHandler : ICommandHandler<CreateClientCommand, ClientResponse>
{
    private readonly IClientRepository _clientRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly TimeProvider _timeProvider;

    public CreateClientCommandHandler(
        IClientRepository clientRepository,
        IUnitOfWork unitOfWork,
        TimeProvider timeProvider)
    {
        _clientRepository = clientRepository;
        _unitOfWork = unitOfWork;
        _timeProvider = timeProvider;
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
            return Result.Failure<ClientResponse>(Error.Conflict(
                "Client.DuplicateConflict",
                "Não foi possível salvar a pessoa devido a um conflito de dados."));
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

        // A deleted client cannot be opened, so only a live one carries the id the UI links to.
        if (clientWithSameCpf.IsDeleted || clientWithSameCpf.Status == ClientStatus.Deleted)
        {
            return FieldConflict("Cpf", new FieldError(
                "Client.DuplicateCpf",
                "Este CPF pertence a um cadastro excluído e não pode ser usado em um novo cadastro."));
        }

        return FieldConflict("Cpf", new FieldError(
            "Client.DuplicateCpf",
            "Já existe uma pessoa cadastrada com este CPF.",
            new Dictionary<string, string> { ["clientId"] = clientWithSameCpf.Id.ToString() }));
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

        return FieldConflict("Email", new FieldError(
            "Client.DuplicateEmail",
            "Já existe uma pessoa ativa cadastrada com este e-mail."));
    }

    private static Error FieldConflict(string field, FieldError fieldError)
    {
        return new Error(
            fieldError.Code,
            fieldError.Message,
            ErrorType.Conflict,
            new Dictionary<string, IReadOnlyList<FieldError>> { [field] = [fieldError] });
    }
}
