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
        var existingGuardians = await DbContext.Set<ClientGuardian>()
            .Where(guardian => guardian.ClientId == client.Id)
            .ToListAsync(cancellationToken);

        var existingReferenceContacts = await DbContext.Set<ClientReferenceContact>()
            .Where(contact => contact.ClientId == client.Id)
            .ToListAsync(cancellationToken);

        DbContext.RemoveRange(existingGuardians);
        DbContext.RemoveRange(existingReferenceContacts);
        DbContext.Entry(client).State = EntityState.Modified;
        DbContext.Set<ClientGuardian>().AddRange(client.Guardians);
        DbContext.Set<ClientReferenceContact>().AddRange(client.ReferenceContacts);
    }

    public Task UpdateStatusAsync(Client client, CancellationToken cancellationToken)
    {
        var entry = DbContext.Entry(client);
        entry.State = EntityState.Unchanged;
        entry.Property(c => c.Status).IsModified = true;

        return Task.CompletedTask;
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
