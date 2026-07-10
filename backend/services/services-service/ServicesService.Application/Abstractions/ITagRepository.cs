using ServicesService.Domain.Entities;

namespace ServicesService.Application.Abstractions;

public interface ITagRepository
{
    Task<IReadOnlyList<Tag>> ListAsync(CancellationToken cancellationToken);

    Task<Tag?> GetByIdAsync(Guid tagId, CancellationToken cancellationToken);

    Task<bool> NameExistsAsync(string name, Guid? excludeTagId, CancellationToken cancellationToken);

    void Add(Tag tag);

    void Remove(Tag tag);
}
