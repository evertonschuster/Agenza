using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class ClientRepository : RepositoryBase<Client>, IClientRepository
{
    private readonly ServicesDataContext _dbContext;

    public ClientRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
        _dbContext = dbContext;
    }

    // IgnoreQueryFilters drops the tenant scope together with the soft-delete one, so the tenant is
    // re-applied by hand here. CurrentTenantId is Guid.Empty with no tenant, which matches no row.
    public Task<Client?> FindByCpfAsync(CpfNumber cpf, CancellationToken cancellationToken)
    {
        var tenantId = _dbContext.CurrentTenantId;

        return Set
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.TenantId == tenantId && c.Cpf == cpf, cancellationToken);
    }

    public Task<Client?> FindActiveByEmailAsync(EmailAddress email, CancellationToken cancellationToken)
    {
        return Set
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == email && c.Status == ClientStatus.Active, cancellationToken);
    }
}
