using Admin.SharedKernel.EntityFrameworkCore;
using IdentityService.Application.Abstractions;
using IdentityService.Domain.Entities;
using IdentityService.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace IdentityService.Infrastructure.Repositories;

public class TenantRepository : RepositoryBase<Tenant>, ITenantRepository
{
    private const string UniqueViolationSqlState = "23505";

    public TenantRepository(IdentityDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<Tenant?> GetByIdAsync(Guid tenantId, CancellationToken cancellationToken) =>
        FindAsync(t => t.Id == tenantId, cancellationToken);

    public Task<bool> NameExistsAsync(string name, CancellationToken cancellationToken) =>
        AnyAsync(t => t.Name == name, cancellationToken);

    public async Task<bool> AddAsync(Tenant tenant, CancellationToken cancellationToken)
    {
        Add(tenant);

        try
        {
            await DbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            return false;
        }
    }

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException is PostgresException { SqlState: UniqueViolationSqlState };
}
