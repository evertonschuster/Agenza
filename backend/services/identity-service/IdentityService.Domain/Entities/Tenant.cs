namespace IdentityService.Domain.Entities;

public class Tenant
{
    public Guid Id { get; private set; }
    public string Name { get; private set; }

    private Tenant()
    {
        Name = string.Empty;
    }

    public Tenant(Guid id, string name)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ArgumentException("Tenant name is required.", nameof(name));
        }

        Id = id;
        Name = name;
    }
}
