using ServicesService.Application.Abstractions;

namespace ServicesService.Infrastructure.Persistence;

public class UnitOfWork : IUnitOfWork
{
    private readonly ServicesDataContext _dbContext;

    public UnitOfWork(ServicesDataContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken) =>
        _dbContext.SaveChangesAsync(cancellationToken);
}
