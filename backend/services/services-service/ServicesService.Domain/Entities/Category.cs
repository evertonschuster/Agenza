using ServicesService.Domain.Common;

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

    private Category(Guid id, string name)
        : base(id)
    {
        Name = name;
    }

    public static DomainResult<Category> Create(Guid id, string name)
    {
        var nameResult = ValidateName(name);

        if (nameResult.IsFailure)
        {
            return DomainResult.Failure<Category>(nameResult.Error);
        }

        return DomainResult.Success(new Category(id, nameResult.Value));
    }

    public DomainResult Update(string name)
    {
        var nameResult = ValidateName(name);

        if (nameResult.IsFailure)
        {
            return DomainResult.Failure(nameResult.Error);
        }

        Name = nameResult.Value;

        return DomainResult.Success();
    }

    private static DomainResult<string> ValidateName(string name)
    {
        var trimmed = name?.Trim() ?? string.Empty;

        if (trimmed.Length is 0 or > NameMaxLength)
        {
            return DomainResult.Failure<string>(new DomainError(
                "Category.Invalid",
                $"O nome da categoria é obrigatório e deve ter no máximo {NameMaxLength} caracteres."));
        }

        return DomainResult.Success(trimmed);
    }
}
