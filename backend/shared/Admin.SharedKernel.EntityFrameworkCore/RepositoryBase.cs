using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace Admin.SharedKernel.EntityFrameworkCore;

public abstract class RepositoryBase<TEntity>
    where TEntity : class
{
    protected RepositoryBase(DbContext dbContext)
    {
        DbContext = dbContext;
    }

    protected DbContext DbContext { get; }

    protected DbSet<TEntity> Set => DbContext.Set<TEntity>();

    protected Task<TEntity?> FindAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken) =>
        Set.FirstOrDefaultAsync(predicate, cancellationToken);

    // asNoTracking is opt-in (defaults false) - only safe for a caller that
    // never attaches the returned entities to another aggregate being saved
    // in the same request (e.g. Category/Tag rows reused to build a
    // Service's response). A caller that does must keep tracking on.
    protected async Task<IReadOnlyList<TEntity>> ListAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>>? order,
        CancellationToken cancellationToken,
        bool asNoTracking = false)
    {
        IQueryable<TEntity> query = asNoTracking ? Set.AsNoTracking() : Set;
        if (order is not null)
        {
            query = order(query);
        }

        return await query.ToListAsync(cancellationToken);
    }

    protected async Task<IReadOnlyList<TEntity>> ListAsync(
        Expression<Func<TEntity, bool>> predicate,
        Func<IQueryable<TEntity>, IQueryable<TEntity>>? order,
        CancellationToken cancellationToken,
        bool asNoTracking = false)
    {
        var query = (asNoTracking ? Set.AsNoTracking() : Set).Where(predicate);
        if (order is not null)
        {
            query = order(query);
        }

        return await query.ToListAsync(cancellationToken);
    }

    protected async Task<(IReadOnlyList<TEntity> Items, int TotalCount)> ListPagedAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>>? order,
        int page,
        int pageSize,
        CancellationToken cancellationToken,
        bool asNoTracking = false)
    {
        IQueryable<TEntity> query = asNoTracking ? Set.AsNoTracking() : Set;
        if (order is not null)
        {
            query = order(query);
        }

        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);
        return (items, totalCount);
    }

    protected Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken) =>
        Set.AnyAsync(predicate, cancellationToken);

    // Handler commits explicitly via IUnitOfWork.
    public virtual void Add(TEntity entity) => Set.Add(entity);

    public virtual void Remove(TEntity entity) => Set.Remove(entity);
}
