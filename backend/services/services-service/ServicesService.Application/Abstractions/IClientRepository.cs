using ServicesService.Domain.Entities;

namespace ServicesService.Application.Abstractions;

public interface IClientRepository
{
    // Matches clients in every situation, deleted included: a CPF is never reused inside a tenant.
    Task<ClientCpfMatch?> FindByCpfAsync(string cpf, CancellationToken cancellationToken);

    Task<bool> ActiveEmailExistsAsync(string email, CancellationToken cancellationToken);

    void Add(Client client);
}

public sealed record ClientCpfMatch(Guid ClientId, bool IsDeleted);
