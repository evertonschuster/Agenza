using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
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
    public Task<ClientCpfMatch?> FindByCpfAsync(string cpf, CancellationToken cancellationToken)
    {
        var tenantId = _dbContext.CurrentTenantId;

        return Set
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(c => c.TenantId == tenantId && c.Cpf == cpf)
            .Select(c => new ClientCpfMatch(c.Id, c.DeletedAt != null || c.Status == ClientStatus.Deleted))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<bool> ActiveEmailExistsAsync(string email, CancellationToken cancellationToken) =>
        AnyAsync(c => c.Email == email && c.Status == ClientStatus.Active, cancellationToken);
}
