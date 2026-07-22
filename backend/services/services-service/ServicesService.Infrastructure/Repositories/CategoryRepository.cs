using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
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

    public Task<IReadOnlyList<Category>> ListAsync(string? search, CancellationToken cancellationToken) =>
        ListAsync(
            query => (string.IsNullOrWhiteSpace(search)
                ? query
                : query.Where(c => EF.Functions.ILike(c.Name, $"%{search.Trim()}%")))
                .OrderBy(c => c.Name),
            cancellationToken);

    public Task<Category?> GetByIdAsync(Guid categoryId, CancellationToken cancellationToken) =>
        FindAsync(c => c.Id == categoryId, cancellationToken);

    public Task<IReadOnlyList<Category>> GetByIdsAsync(IReadOnlyCollection<Guid> categoryIds, CancellationToken cancellationToken) =>
        ListAsync(c => categoryIds.Contains(c.Id), order: null, cancellationToken);

    public Task<bool> NameExistsAsync(string name, Guid? excludeCategoryId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLowerInvariant();
        return AnyAsync(
            c => EF.Property<string>(c, "NameNormalized") == normalized
                && (excludeCategoryId == null || c.Id != excludeCategoryId),
            cancellationToken);
    }
}
