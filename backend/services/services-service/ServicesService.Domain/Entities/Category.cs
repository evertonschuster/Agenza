using ServicesService.Domain.Common;
using ServicesService.Domain.Exceptions;

namespace ServicesService.Domain.Entities;

// Name uniqueness per tenant is a cross-aggregate rule, enforced in the CreateCategory/UpdateCategory use cases via ICategoryRepository, not here.
public class Category : TenantOwnedEntity
{
    public const int NameMaxLength = 60;

    public string Name { get; private set; }

    // EF Core materialization only.
    private Category()
    {
        Name = string.Empty;
    }

    public Category(Guid id, string name)
        : base(id)
    {
        Name = ValidateName(name);
    }

    public void Update(string name)
    {
        Name = ValidateName(name);
    }

    private static string ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length is 0 or > NameMaxLength)
        {
            throw new InvalidCategoryException(
                $"O nome da categoria é obrigatório e deve ter no máximo {NameMaxLength} caracteres.");
        }

        return trimmed;
    }
}
