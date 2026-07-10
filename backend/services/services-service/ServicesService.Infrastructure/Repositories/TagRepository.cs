using Admin.SharedKernel.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class TagRepository : RepositoryBase<Tag>, ITagRepository
{
    public TagRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<IReadOnlyList<Tag>> ListAsync(CancellationToken cancellationToken) =>
        ListAsync(query => query.OrderBy(t => t.Name), cancellationToken);

    public Task<Tag?> GetByIdAsync(Guid tagId, CancellationToken cancellationToken) =>
        FindAsync(t => t.Id == tagId, cancellationToken);

    public Task<bool> NameExistsAsync(string name, Guid? excludeTagId, CancellationToken cancellationToken)
    {
        var normalized = name.Trim().ToLower();
        return AnyAsync(
            t => t.Name.ToLower() == normalized && (excludeTagId == null || t.Id != excludeTagId),
            cancellationToken);
    }
}
