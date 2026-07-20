using Admin.SharedKernel.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class CategoryRepository : RepositoryBase<Category>, ICategoryRepository
{
    public CategoryRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<IReadOnlyList<Category>> ListAsync(CancellationToken cancellationToken) =>
        ListAsync(query => query.OrderBy(c => c.Name), cancellationToken);

    public Task<Category?> GetByIdAsync(Guid categoryId, CancellationToken cancellationToken) =>
        FindAsync(c => c.Id == categoryId, cancellationToken);

    public Task<bool> NameExistsAsync(string name, Guid? excludeCategoryId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLower();
        return AnyAsync(
            c => c.Name.ToLower() == normalized && (excludeCategoryId == null || c.Id != excludeCategoryId),
            cancellationToken);
    }
}
