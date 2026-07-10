using IdentityService.Domain.Common;

namespace IdentityService.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; private set; }

    private Tenant()
    {
        Name = string.Empty;
    }

    public Tenant(Guid id, string name)
        : base(id)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Tenant name is required.", nameof(name));
        }

        Name = name;
    }
}
