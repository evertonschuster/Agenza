using IdentityService.Domain.Common;

namespace IdentityService.Domain.Entities;

public class Tenant : BaseEntity
{
    public string Name { get; private set; }

    private Tenant()
    {
        Name = string.Empty;
    }

    private Tenant(Guid id, string name)
        : base(id)
    {
        Name = name;
    }

    public static DomainResult<Tenant> Create(Guid id, string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return DomainResult.Failure<Tenant>(
                new DomainError("Tenant.Invalid", "O nome do tenant é obrigatório."));
        }

        return DomainResult.Success(new Tenant(id, name));
    }
}
