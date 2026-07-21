using ServicesService.Domain.Entities;
using ServicesService.Domain.Exceptions;

namespace ServicesService.Tests;

public class CategoryTests
{
    [Fact]
    public void Constructor_WithValidValues_TrimsAndSets()
    {
        var id = Guid.NewGuid();

        var category = new Category(id, "  Hair  ");

        category.Id.Should().Be(id);
        category.TenantId.Should().Be(Guid.Empty);
        category.Name.Should().Be("Hair");
    }

    [Fact]
    public void AssignTenant_WithValidTenant_SetsTenantId()
    {
        var category = new Category(Guid.NewGuid(), "Hair");
        var tenantId = Guid.NewGuid();

        category.AssignTenant(tenantId);

        category.TenantId.Should().Be(tenantId);
    }

    [Fact]
    public void AssignTenant_WithEmptyTenant_Throws()
    {
        var category = new Category(Guid.NewGuid(), "Hair");

        var act = () => category.AssignTenant(Guid.Empty);

        act.Should().Throw<InvalidTenantException>();
    }

    [Fact]
    public void Update_WithValidValues_ReplacesName()
    {
        var category = new Category(Guid.NewGuid(), "Hair");

        category.Update("  Nails  ");

        category.Name.Should().Be("Nails");
    }

    [Fact]
    public void Constructor_WithEmptyName_Throws()
    {
        var act = () => new Category(Guid.NewGuid(), "   ");

        act.Should().Throw<InvalidCategoryException>();
    }

    [Fact]
    public void Constructor_WithNameOverMaxLength_Throws()
    {
        var act = () => new Category(Guid.NewGuid(), new string('x', Category.NameMaxLength + 1));

        act.Should().Throw<InvalidCategoryException>();
    }

    [Fact]
    public void Update_WithEmptyName_Throws()
    {
        var category = new Category(Guid.NewGuid(), "Hair");

        var act = () => category.Update("   ");

        act.Should().Throw<InvalidCategoryException>();
    }

    [Fact]
    public void MarkCreated_SetsCreatedAtAndCreatedBy()
    {
        var category = new Category(Guid.NewGuid(), "Hair");
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        category.MarkCreated(actorId, now);

        category.CreatedAt.Should().Be(now);
        category.CreatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkDeleted_SetsDeletedAtAndDeletedByAndIsDeleted()
    {
        var category = new Category(Guid.NewGuid(), "Hair");
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        category.IsDeleted.Should().BeFalse();

        category.MarkDeleted(actorId, now);

        category.DeletedAt.Should().Be(now);
        category.DeletedBy.Should().Be(actorId);
        category.IsDeleted.Should().BeTrue();
    }
}
