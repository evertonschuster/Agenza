using ServicesService.Domain.Entities;
using ServicesService.Domain.Exceptions;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests;

public class ServiceTests
{
    private static Service CreateValidService(Guid? categoryId = null) =>
        new(Guid.NewGuid(), "Haircut", "A classic cut", 30, 15, 60, 45.50m, 10m, categoryId, 1);

    [Fact]
    public void Constructor_WithValidValues_TrimsAndSets()
    {
        var id = Guid.NewGuid();
        var categoryId = Guid.NewGuid();

        var service = new Service(id, "  Haircut  ", "  A classic cut  ", 30, 15, 60, 45.50m, 10m, categoryId, 7);

        service.Id.Should().Be(id);
        service.TenantId.Should().Be(Guid.Empty);
        service.Code.Should().Be(7);
        service.Name.Should().Be("Haircut");
        service.Description.Should().Be("A classic cut");
        service.DurationMinutes.Should().Be(30);
        service.MinDurationMinutes.Should().Be(15);
        service.MaxDurationMinutes.Should().Be(60);
        service.Price.Should().Be(45.50m);
        service.MaxDiscountPercentage.Should().Be(10m);
        service.CategoryId.Should().Be(categoryId);
        service.Tags.Should().BeEmpty();
    }

    [Fact]
    public void Constructor_WithNoCategory_LeavesCategoryIdNull()
    {
        var service = CreateValidService();

        service.CategoryId.Should().BeNull();
    }

    [Fact]
    public void AssignTenant_WithValidTenant_SetsTenantId()
    {
        var service = CreateValidService();
        var tenantId = Guid.NewGuid();

        service.AssignTenant(tenantId);

        service.TenantId.Should().Be(tenantId);
    }

    [Fact]
    public void AssignTenant_WithEmptyTenant_Throws()
    {
        var service = CreateValidService();

        var act = () => service.AssignTenant(Guid.Empty);

        act.Should().Throw<InvalidTenantException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_WithBlankDescription_StoresNull(string? description)
    {
        var service = new Service(Guid.NewGuid(), "Haircut", description, 30, 15, 60, 45.50m, 10m, null, 1);

        service.Description.Should().BeNull();
    }

    [Fact]
    public void Update_WithValidValues_ReplacesEveryFieldExceptCode()
    {
        var service = CreateValidService();
        var categoryId = Guid.NewGuid();

        service.Update("  Deep Tissue Massage  ", null, 90, 60, 120, 90.00m, 25m, categoryId);

        service.Name.Should().Be("Deep Tissue Massage");
        service.Description.Should().BeNull();
        service.DurationMinutes.Should().Be(90);
        service.MinDurationMinutes.Should().Be(60);
        service.MaxDurationMinutes.Should().Be(120);
        service.Price.Should().Be(90.00m);
        service.MaxDiscountPercentage.Should().Be(25m);
        service.CategoryId.Should().Be(categoryId);
        service.Code.Should().Be(1);
    }

    [Fact]
    public void SetTags_ReplacesTheTagCollection()
    {
        var service = CreateValidService();
        var tag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);

        service.SetTags([tag]);

        service.Tags.Should().ContainSingle().Which.Should().Be(tag);
    }

    [Fact]
    public void SetTags_CalledAgain_ReplacesThePreviousTags()
    {
        var service = CreateValidService();
        var firstTag = new Tag(Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null);
        var secondTag = new Tag(Guid.NewGuid(), "Returning", TagColor.From("#ef4444"), null);
        service.SetTags([firstTag]);

        service.SetTags([secondTag]);

        service.Tags.Should().ContainSingle().Which.Should().Be(secondTag);
    }

    [Fact]
    public void MarkCreated_SetsCreatedAtAndCreatedBy()
    {
        var service = CreateValidService();
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        service.MarkCreated(actorId, now);

        service.CreatedAt.Should().Be(now);
        service.CreatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkDeleted_SetsDeletedAtAndDeletedByAndIsDeleted()
    {
        var service = CreateValidService();
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        service.IsDeleted.Should().BeFalse();

        service.MarkDeleted(actorId, now);

        service.DeletedAt.Should().Be(now);
        service.DeletedBy.Should().Be(actorId);
        service.IsDeleted.Should().BeTrue();
    }
}
