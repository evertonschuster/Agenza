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

    protected async Task<IReadOnlyList<TEntity>> ListAsync(
        Func<IQueryable<TEntity>, IQueryable<TEntity>>? order,
        CancellationToken cancellationToken)
    {
        IQueryable<TEntity> query = Set;
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
        var query = Set.Where(predicate);
        if (order is not null)
        {
            query = order(query);
        }

        return await query.ToListAsync(cancellationToken);
    }

    protected Task<bool> AnyAsync(Expression<Func<TEntity, bool>> predicate, CancellationToken cancellationToken) =>
        Set.AnyAsync(predicate, cancellationToken);

    // Handler commits explicitly via IUnitOfWork.
    public virtual void Add(TEntity entity) => Set.Add(entity);

    public virtual void Remove(TEntity entity) => Set.Remove(entity);
}
