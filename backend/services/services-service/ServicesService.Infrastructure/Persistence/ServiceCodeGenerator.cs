using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;

namespace ServicesService.Infrastructure.Persistence;

public class ServiceCodeGenerator : IServiceCodeGenerator
{
    private readonly ServicesDataContext _dbContext;
    private readonly ICurrentTenantProvider _currentTenantProvider;

    public ServiceCodeGenerator(ServicesDataContext dbContext, ICurrentTenantProvider currentTenantProvider)
    {
        _dbContext = dbContext;
        _currentTenantProvider = currentTenantProvider;
    }

    public async Task<int> GetNextCodeAsync(CancellationToken cancellationToken)
    {
        var tenantId = _currentTenantProvider.TenantId;

        // Shares the ambient transaction with the caller's later SaveChangesAsync
        // (UnitOfWork commits/rolls back both together) so a rejected create
        // doesn't permanently burn a code from the tenant's sequence.
        if (_dbContext.Database.CurrentTransaction is null)
        {
            await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        }

        var lastValues = await _dbContext.Database
            .SqlQuery<int>(
                $"""
                 INSERT INTO services."TenantSequences" ("TenantId", "EntityName", "LastValue")
                 VALUES ({tenantId}, 'Service', 1)
                 ON CONFLICT ("TenantId", "EntityName")
                 DO UPDATE SET "LastValue" = "TenantSequences"."LastValue" + 1
                 RETURNING "LastValue"
                 """)
            .ToListAsync(cancellationToken);

        return lastValues[0];
    }
}
