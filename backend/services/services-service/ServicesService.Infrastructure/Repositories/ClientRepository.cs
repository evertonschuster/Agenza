using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class ClientRepository : RepositoryBase<Client>, IClientRepository
{
    public ClientRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<Client?> FindByCpfAsync(CpfNumber cpf, CancellationToken cancellationToken)
    {
        return Set
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Cpf == cpf, cancellationToken);
    }

    public Task<Client?> FindActiveByEmailAsync(EmailAddress email, CancellationToken cancellationToken)
    {
        return Set
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == email && c.Status == ClientStatus.Active, cancellationToken);
    }
}
