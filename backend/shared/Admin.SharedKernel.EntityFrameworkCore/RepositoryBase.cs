using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

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
        Set.AsNoTracking().FirstOrDefaultAsync(predicate, cancellationToken);

    protected Task<TEntity?> FindForUpdateAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken) =>
        Set.AsTracking().FirstOrDefaultAsync(predicate, cancellationToken);

    protected async Task<IReadOnlyList<TEntity>> ListAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>>? order,
        CancellationToken cancellationToken)
    {
        IQueryable<TEntity> query = Set.AsNoTracking();
        if (order is not null)
        {
            query = order(query);
        }

        return await query.ToListAsync(cancellationToken);
    }

    protected async Task<IReadOnlyList<TEntity>> ListAsync(
        Expression<Func<TEntity, bool>> predicate,
        Func<IQueryable<TEntity>, IQueryable<TEntity>>? order,
        CancellationToken cancellationToken)
    {
        var query = Set.AsNoTracking().Where(predicate);
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
        CancellationToken cancellationToken)
    {
        IQueryable<TEntity> query = Set.AsNoTracking();
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
