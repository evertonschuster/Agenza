using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class ServiceRepository : RepositoryBase<Service>, IServiceRepository
{
    public ServiceRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<(IReadOnlyList<Service> Items, int TotalCount)> ListAsync(
        int page,
        int pageSize,
        string? search,
        Guid? categoryId,
        Guid? tagId,
        CancellationToken cancellationToken)
    {
        return ListPagedAsync(
            query => query
                .Include(s => s.Tags)
                .Where(s => string.IsNullOrWhiteSpace(search) || EF.Functions.ILike(s.Name, $"%{search.Trim()}%"))
                .Where(s => categoryId == null || s.CategoryId == categoryId)
                .Where(s => tagId == null || s.Tags.Any(link => link.TagId == tagId))
                .OrderBy(s => s.Name)
                .ThenBy(s => s.Id),
            page,
            pageSize,
            cancellationToken,
            asNoTracking: true);
    }

    public Task<Service?> GetByIdAsync(Guid serviceId, CancellationToken cancellationToken)
    {
        return Set.Include(s => s.Tags).FirstOrDefaultAsync(s => s.Id == serviceId, cancellationToken);
    }

    public Task<Service?> FindByNameAsync(string name, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLowerInvariant();
        return Set
            .AsNoTracking()
            .FirstOrDefaultAsync(s => EF.Property<string>(s, "NameNormalized") == normalized, cancellationToken);
    }

    public Task<int> CountByCategoryIdAsync(Guid categoryId, CancellationToken cancellationToken)
    {
        return Set.CountAsync(s => s.CategoryId == categoryId, cancellationToken);
    }

    public Task<int> CountByTagIdAsync(Guid tagId, CancellationToken cancellationToken)
    {
        return Set.CountAsync(s => s.Tags.Any(link => link.TagId == tagId), cancellationToken);
    }
}
