using IdentityService.Domain.Entities;

namespace IdentityService.Tests;

public class TenantTests
{
    [Fact]
    public void Constructor_WithValidName_SetsIdAndName()
    {
        var id = Guid.NewGuid();

        var tenant = new Tenant(id, "Bella Studio");

        tenant.Id.Should().Be(id);
        tenant.Name.Should().Be("Bella Studio");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_WithMissingName_Throws(string name)
    {
        var act = () => new Tenant(Guid.NewGuid(), name);

        act.Should().Throw<ArgumentException>().And.ParamName.Should().Be("name");
    }

    [Fact]
    public void MarkCreated_SetsCreatedAtAndCreatedBy()
    {
        var tenant = new Tenant(Guid.NewGuid(), "Bella Studio");
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        tenant.MarkCreated(actorId, now);

        tenant.CreatedAt.Should().Be(now);
        tenant.CreatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkUpdated_SetsUpdatedAtAndUpdatedBy()
    {
        var tenant = new Tenant(Guid.NewGuid(), "Bella Studio");
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        tenant.MarkUpdated(actorId, now);

        tenant.UpdatedAt.Should().Be(now);
        tenant.UpdatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkDeleted_SetsDeletedAtAndDeletedByAndIsDeleted()
    {
        var tenant = new Tenant(Guid.NewGuid(), "Bella Studio");
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        tenant.IsDeleted.Should().BeFalse();

        tenant.MarkDeleted(actorId, now);

        tenant.DeletedAt.Should().Be(now);
        tenant.DeletedBy.Should().Be(actorId);
        tenant.IsDeleted.Should().BeTrue();
    }
}
