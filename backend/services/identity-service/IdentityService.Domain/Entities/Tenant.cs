using IdentityService.Domain.Common;
using IdentityService.Domain.Exceptions;

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
            throw new InvalidTenantException("O nome do tenant é obrigatório.");
        }

        Name = name;
    }
}
