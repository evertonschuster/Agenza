namespace ServicesService.Application.Abstractions;

public interface IClientRepository
{
    Task<Client?> GetByIdAsync(Guid clientId, CancellationToken cancellationToken);

    Task UpdateAsync(Client client, CancellationToken cancellationToken);

    // Writes the status alone: the contacts and the other columns stay as they are, unlike UpdateAsync.
    Task UpdateStatusAsync(Client client, CancellationToken cancellationToken);

    // excludeClientId ignores the client being edited, so saving a client without changing its CPF isn't a self-conflict.
    Task<Client?> FindByCpfAsync(CpfNumber cpf, Guid? excludeClientId, CancellationToken cancellationToken);

    Task<Client?> FindActiveByEmailAsync(EmailAddress email, Guid? excludeClientId, CancellationToken cancellationToken);

    void Add(Client client);
}
