using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Abstractions;

public interface IClientRepository
{
    Task<Client?> GetByIdAsync(Guid clientId, CancellationToken cancellationToken);

    // excludeClientId ignores the client being edited, so saving a client without changing its CPF isn't a self-conflict.
    Task<Client?> FindByCpfAsync(CpfNumber cpf, Guid? excludeClientId, CancellationToken cancellationToken);

    Task<Client?> FindActiveByEmailAsync(EmailAddress email, Guid? excludeClientId, CancellationToken cancellationToken);

    void Add(Client client);
}
