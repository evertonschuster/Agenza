using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Application.Abstractions;

public interface IClientRepository
{
    // Matches clients in every situation, deleted included: a CPF is never reused inside a tenant.
    Task<ClientMatch?> FindByCpfAsync(CpfNumber cpf, CancellationToken cancellationToken);

    Task<ClientMatch?> FindActiveByEmailAsync(EmailAddress email, CancellationToken cancellationToken);

    void Add(Client client);
}

public sealed record ClientMatch(Guid Id, FullName FullName, bool IsDeleted);
