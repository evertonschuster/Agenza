using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Infrastructure.Persistence;

namespace ServicesService.Infrastructure.Repositories;

public class ClientRepository : RepositoryBase<Client>, IClientRepository
{
    public ClientRepository(ServicesDataContext dbContext)
        : base(dbContext)
    {
    }

    public Task<Client?> GetByIdAsync(Guid clientId, CancellationToken cancellationToken)
    {
        return Set
            .Include(client => client.Guardians.OrderBy(guardian => guardian.Name).ThenBy(guardian => guardian.Id))
            .Include(client => client.ReferenceContacts.OrderBy(contact => contact.Name).ThenBy(contact => contact.Id))
            .FirstOrDefaultAsync(client => client.Id == clientId, cancellationToken);
    }

    public async Task UpdateAsync(Client client, CancellationToken cancellationToken)
    {
        await SyncContactsAsync(client.Id, client.Guardians, cancellationToken);
        await SyncContactsAsync(client.Id, client.ReferenceContacts, cancellationToken);

        DbContext.Entry(client).State = EntityState.Modified;
    }

    private async Task SyncContactsAsync<TContact>(Guid clientId, IReadOnlyCollection<TContact> currentContacts, CancellationToken cancellationToken) where TContact : ClientContact
    {
        var existingContacts = await DbContext.Set<TContact>()
            .Where(contact => contact.ClientId == clientId)
            .ToListAsync(cancellationToken);

        var currentIds = currentContacts.Select(contact => contact.Id).ToHashSet();
        var existingIds = existingContacts.Select(contact => contact.Id).ToHashSet();

        var removedContacts = existingContacts.ExceptBy(currentIds, contact => contact.Id);
        var addedContacts = currentContacts.ExceptBy(existingIds, contact => contact.Id);

        DbContext.RemoveRange(removedContacts);
        DbContext.Set<TContact>().AddRange(addedContacts);
    }

    public Task<Client?> FindByCpfAsync(CpfNumber cpf, Guid? excludeClientId, CancellationToken cancellationToken)
    {
        return Set
            .FirstOrDefaultAsync(c => c.Cpf == cpf && (excludeClientId == null || c.Id != excludeClientId), cancellationToken);
    }

    public Task<Client?> FindActiveByEmailAsync(
        EmailAddress email,
        Guid? excludeClientId,
        CancellationToken cancellationToken)
    {
        return Set
            .FirstOrDefaultAsync(
                c => c.Email == email
                    && c.Status == ClientStatus.Active
                    && (excludeClientId == null || c.Id != excludeClientId),
                cancellationToken);
    }
}
