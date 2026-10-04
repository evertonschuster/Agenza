using ServicesService.Domain.Common;

namespace ServicesService.Domain.Entities;

public class ServiceTag : TenantOwnedEntity
{
    public Guid ServiceId { get; private set; }
    public Guid TagId { get; private set; }

    // EF Core materialization only.
    private ServiceTag()
    {
    }

    private ServiceTag(Guid id, Guid serviceId, Guid tagId)
        : base(id)
    {
        ServiceId = serviceId;
        TagId = tagId;
    }

    internal static ServiceTag Create(Guid id, Guid serviceId, Guid tagId)
    {
        return new ServiceTag(id, serviceId, tagId);
    }
}
