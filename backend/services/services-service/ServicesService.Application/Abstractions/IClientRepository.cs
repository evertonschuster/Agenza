using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Abstractions;

public interface IClientRepository
{
    // Matches clients in every situation, deleted included: a CPF is never reused inside a tenant.
    Task<Client?> FindByCpfAsync(CpfNumber cpf, CancellationToken cancellationToken);

    Task<Client?> FindActiveByEmailAsync(EmailAddress email, CancellationToken cancellationToken);

    void Add(Client client);
}
