using ServicesService.Domain.Entities;

namespace ServicesService.Application.Abstractions;

public interface ICategoryRepository
{
    Task<IReadOnlyList<Category>> ListAsync(string? search, CancellationToken cancellationToken);

    Task<Category?> GetByIdAsync(Guid categoryId, CancellationToken cancellationToken);

    Task<IReadOnlyList<Category>> GetByIdsAsync(IReadOnlyCollection<Guid> categoryIds, CancellationToken cancellationToken);

    // excludeCategoryId ignores the category being renamed, so updating a category without changing its name isn't a self-conflict.
    Task<bool> NameExistsAsync(string name, Guid? excludeCategoryId, CancellationToken cancellationToken);

    void Add(Category category);

    void Remove(Category category);
}
