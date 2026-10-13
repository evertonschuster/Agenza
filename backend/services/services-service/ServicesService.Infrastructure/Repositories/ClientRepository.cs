using Admin.SharedKernel;
using Admin.SharedKernel.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Clients;
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

    public Task<PagedResult<Client>> ListAsync(ClientListFilter filter, CancellationToken cancellationToken)
    {
        return ListPagedAsync(filter, query => FilterAndOrder(query, filter), cancellationToken);
    }

    private static IQueryable<Client> FilterAndOrder(IQueryable<Client> query, ClientListFilter filter)
    {
        if (filter.Status is { } wantedStatus)
        {
            query = query.Where(client => client.Status == wantedStatus);
        }

        if (filter.Text is { } text)
        {
            query = Search(query, text, filter.CpfDigits);
        }

        return query
            .OrderBy(client => EF.Property<string>(client, "NameNormalized"))
            .ThenBy(client => client.Id);
    }

    private static IQueryable<Client> Search(IQueryable<Client> query, string text, string? cpfDigits)
    {
        if (cpfDigits is not null)
        {
            return query.Where(client =>
                EF.Property<string>(client, "NameNormalized").Contains(text)
                || EF.Property<string>(client, "EmailNormalized").Contains(text)
                || EF.Property<string>(client, "CpfNormalized").Contains(cpfDigits));
        }

        return query.Where(client =>
            EF.Property<string>(client, "NameNormalized").Contains(text)
            || EF.Property<string>(client, "EmailNormalized").Contains(text));
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
