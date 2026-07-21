using IdentityService.Domain.Entities;

namespace IdentityService.Tests;

public class TenantTests
{
    [Fact]
    public void Create_WithValidName_ReturnsSuccessWithIdAndName()
    {
        var id = Guid.NewGuid();

        var result = Tenant.Create(id, "Bella Studio");

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(id);
        result.Value.Name.Should().Be("Bella Studio");
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithMissingName_ReturnsFailure(string name)
    {
        var result = Tenant.Create(Guid.NewGuid(), name);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Tenant.Invalid");
    }

    [Fact]
    public void MarkCreated_SetsCreatedAtAndCreatedBy()
    {
        var tenant = Tenant.Create(Guid.NewGuid(), "Bella Studio").Value;
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        tenant.MarkCreated(actorId, now);

        tenant.CreatedAt.Should().Be(now);
        tenant.CreatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkUpdated_SetsUpdatedAtAndUpdatedBy()
    {
        var tenant = Tenant.Create(Guid.NewGuid(), "Bella Studio").Value;
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        tenant.MarkUpdated(actorId, now);

        tenant.UpdatedAt.Should().Be(now);
        tenant.UpdatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkDeleted_SetsDeletedAtAndDeletedByAndIsDeleted()
    {
        var tenant = Tenant.Create(Guid.NewGuid(), "Bella Studio").Value;
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        tenant.IsDeleted.Should().BeFalse();

        tenant.MarkDeleted(actorId, now);

        tenant.DeletedAt.Should().Be(now);
        tenant.DeletedBy.Should().Be(actorId);
        tenant.IsDeleted.Should().BeTrue();
    }
}
