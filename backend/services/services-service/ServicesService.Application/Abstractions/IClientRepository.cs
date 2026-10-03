using ServicesService.Domain.Entities;

namespace ServicesService.Application.Abstractions;

public interface IClientRepository
{
    // Matches clients in every situation, deleted included: a CPF is never reused inside a tenant.
    Task<Client?> FindByCpfAsync(string cpf, CancellationToken cancellationToken);

    Task<Client?> FindActiveByEmailAsync(string email, CancellationToken cancellationToken);

    void Add(Client client);
}
