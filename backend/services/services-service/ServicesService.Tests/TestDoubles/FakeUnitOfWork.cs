using ServicesService.Application.Abstractions;

namespace ServicesService.Tests.TestDoubles;

public class FakeUnitOfWork : IUnitOfWork
{
    public int SaveChangesCalls { get; private set; }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken)
    {
        SaveChangesCalls++;
        return Task.FromResult(0);
    }
}
