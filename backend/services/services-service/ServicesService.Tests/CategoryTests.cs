using ServicesService.Domain.Entities;

namespace ServicesService.Tests;

public class CategoryTests
{
    [Fact]
    public void Create_WithValidValues_TrimsAndSets()
    {
        var id = Guid.NewGuid();

        var result = Category.Create(id, "  Hair  ");

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(id);
        result.Value.TenantId.Should().Be(Guid.Empty);
        result.Value.Name.Should().Be("Hair");
    }

    [Fact]
    public void AssignTenant_WithValidTenant_SetsTenantId()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        var tenantId = Guid.NewGuid();

        category.AssignTenant(tenantId);

        category.TenantId.Should().Be(tenantId);
    }

    [Fact]
    public void AssignTenant_WithEmptyTenant_Throws()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;

        var act = () => category.AssignTenant(Guid.Empty);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void Update_WithValidValues_ReplacesName()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;

        var result = category.Update("  Nails  ");

        result.IsSuccess.Should().BeTrue();
        category.Name.Should().Be("Nails");
    }

    [Fact]
    public void Create_WithEmptyName_ReturnsFailure()
    {
        var result = Category.Create(Guid.NewGuid(), "   ");

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Category.Invalid");
    }

    [Fact]
    public void Create_WithNameOverMaxLength_ReturnsFailure()
    {
        var result = Category.Create(Guid.NewGuid(), new string('x', Category.NameMaxLength + 1));

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Category.Invalid");
    }

    [Fact]
    public void Update_WithEmptyName_ReturnsFailureWithoutMutating()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;

        var result = category.Update("   ");

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Category.Invalid");
        category.Name.Should().Be("Hair");
    }

    [Fact]
    public void MarkCreated_SetsCreatedAtAndCreatedBy()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        category.MarkCreated(actorId, now);

        category.CreatedAt.Should().Be(now);
        category.CreatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkDeleted_SetsDeletedAtAndDeletedByAndIsDeleted()
    {
        var category = Category.Create(Guid.NewGuid(), "Hair").Value;
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        category.IsDeleted.Should().BeFalse();

        category.MarkDeleted(actorId, now);

        category.DeletedAt.Should().Be(now);
        category.DeletedBy.Should().Be(actorId);
        category.IsDeleted.Should().BeTrue();
    }
}
