using Admin.SharedKernel;
using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class ServiceRepository : RepositoryBase<Service>, IServiceRepository
{
    public ServiceRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<PagedResult<Service>> ListAsync(ServiceListFilter filter, CancellationToken cancellationToken)
    {
        return ListPagedAsync(filter, query => FilterAndOrder(query, filter), cancellationToken);
    }

    private static IQueryable<Service> FilterAndOrder(IQueryable<Service> query, ServiceListFilter filter)
    {
        query = query.Include(service => service.Tags);

        if (filter.Search is { } search)
        {
            query = query.Where(service => EF.Functions.ILike(service.Name, $"%{search}%"));
        }

        if (filter.CategoryId is { } categoryId)
        {
            query = query.Where(service => service.CategoryId == categoryId);
        }

        if (filter.TagId is { } tagId)
        {
            query = query.Where(service => service.Tags.Any(tag => tag.Id == tagId));
        }

        return query
            .OrderBy(service => service.Name)
            .ThenBy(service => service.Id);
    }

    public Task<Service?> GetByIdAsync(Guid serviceId, CancellationToken cancellationToken) =>
        Set.Include(s => s.Tags).FirstOrDefaultAsync(s => s.Id == serviceId, cancellationToken);

    public async Task UpdateAsync(Service service, CancellationToken cancellationToken)
    {
        var persisted = await Set.AsTracking()
            .Include(s => s.Tags)
            .SingleAsync(s => s.Id == service.Id, cancellationToken);

        var tagIds = service.Tags.Select(tag => tag.Id).ToList();
        var tags = await DbContext.Set<Tag>()
            .AsTracking()
            .Where(tag => tagIds.Contains(tag.Id))
            .ToListAsync(cancellationToken);

        DbContext.Entry(persisted).CurrentValues.SetValues(service);
        persisted.SetTags(tags);
    }

    public override void Add(Service service)
    {
        DbContext.AttachRange(service.Tags);
        base.Add(service);
    }

    public Task<bool> NameExistsAsync(string name, Guid? excludeServiceId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLowerInvariant();
        return AnyAsync(
            s => EF.Property<string>(s, "NameNormalized") == normalized
                && (excludeServiceId == null || s.Id != excludeServiceId),
            cancellationToken);
    }

    public Task<int> CountByCategoryIdAsync(Guid categoryId, CancellationToken cancellationToken) =>
        Set.CountAsync(s => s.CategoryId == categoryId, cancellationToken);

    public Task<int> CountByTagIdAsync(Guid tagId, CancellationToken cancellationToken) =>
        Set.CountAsync(s => s.Tags.Any(t => t.Id == tagId), cancellationToken);
}
