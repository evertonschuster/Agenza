namespace ServicesService.Domain.Entities;

public sealed class ClientTag : TenantOwnedEntity
{
    public Guid ClientId { get; private set; }
    public Guid TagId { get; private set; }

    // EF Core materialization only.
    private ClientTag()
    {
    }

    private ClientTag(Guid id, Guid clientId, Guid tagId)
        : base(id)
    {
        ClientId = clientId;
        TagId = tagId;
    }

    internal static ClientTag Create(Guid clientId, Guid tagId)
    {
        return new ClientTag(Guid.CreateVersion7(), clientId, tagId);
    }
}
