using System.Linq.Expressions;
using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class ClientRepository : RepositoryBase<Client>, IClientRepository
{
    private static readonly Expression<Func<Client, ClientMatch>> ToMatch =
        client => new ClientMatch(client.Id, client.FullName);

    public ClientRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<ClientMatch?> FindByCpfAsync(CpfNumber cpf, CancellationToken cancellationToken)
    {
        return Set
            .Where(c => c.Cpf == cpf)
            .Select(ToMatch)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<ClientMatch?> FindActiveByEmailAsync(EmailAddress email, CancellationToken cancellationToken)
    {
        return Set
            .Where(c => c.Email == email && c.Status == ClientStatus.Active)
            .Select(ToMatch)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
