using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;

namespace Admin.SharedKernel.EntityFrameworkCore;

/// <summary>
/// Generic EF Core CRUD building block for per-aggregate repositories
/// (TagRepository, TenantRepository, ...). Concrete repositories still
/// own their own interface and their own tenant-scoped query methods
/// (the repo non-negotiable that every method takes the tenant id
/// explicitly can't be generalized safely - Tenant itself isn't
/// tenant-scoped, some queries need extra filters) - this just removes
/// the copy-pasted Add/Remove/Find/List boilerplate underneath them.
/// </summary>
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

    // Add/Remove only stage the change on the tracked DbContext - the
    // command handler commits explicitly via IUnitOfWork, so the commit
    // boundary stays the handler's decision, not the repository's.
    public virtual void Add(TEntity entity) => Set.Add(entity);

    public virtual void Remove(TEntity entity) => Set.Remove(entity);
}
