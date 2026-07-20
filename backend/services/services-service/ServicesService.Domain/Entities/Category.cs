using ServicesService.Domain.Common;

namespace ServicesService.Domain.Entities;

// Name uniqueness per tenant is a cross-aggregate rule, enforced in the CreateCategory/UpdateCategory use cases via ICategoryRepository, not here.
// All shape/invariant validation lives in CreateCategoryCommandValidator/UpdateCategoryCommandValidator (docs/adr/0011) - this entity trusts its inputs.
public class Category : TenantOwnedEntity
{
    public const int NameMaxLength = 100;

    public string Name { get; private set; }

    // EF Core materialization only.
    private Category()
    {
        Name = string.Empty;
    }

    public Category(Guid id, string name)
        : base(id)
    {
        Name = name.Trim();
    }

    public void Update(string name)
    {
        Name = name.Trim();
    }
}
