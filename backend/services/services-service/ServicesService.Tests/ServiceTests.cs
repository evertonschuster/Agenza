using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests;

public class ServiceTests
{
    private static Service CreateValidService(Guid? categoryId = null) =>
        Service.Create(Guid.NewGuid(), "Haircut", "A classic cut", 30, 15, 60, 45.50m, 10m, categoryId, 1).Value;

    [Fact]
    public void Create_WithValidValues_TrimsAndSets()
    {
        var id = Guid.NewGuid();
        var categoryId = Guid.NewGuid();

        var result = Service.Create(id, "  Haircut  ", "  A classic cut  ", 30, 15, 60, 45.50m, 10m, categoryId, 7);

        result.IsSuccess.Should().BeTrue();
        var service = result.Value;
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
    public void Create_WithNoCategory_LeavesCategoryIdNull()
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

        act.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankDescription_StoresNull(string? description)
    {
        var result = Service.Create(Guid.NewGuid(), "Haircut", description, 30, 15, 60, 45.50m, 10m, null, 1);

        result.IsSuccess.Should().BeTrue();
        result.Value.Description.Should().BeNull();
    }

    [Fact]
    public void Update_WithValidValues_ReplacesEveryFieldExceptCode()
    {
        var service = CreateValidService();
        var categoryId = Guid.NewGuid();

        var result = service.Update("  Deep Tissue Massage  ", null, 90, 60, 120, 90.00m, 25m, categoryId);

        result.IsSuccess.Should().BeTrue();
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
    public void Create_WithEmptyName_ReturnsFailure()
    {
        var result = Service.Create(Guid.NewGuid(), "   ", null, 30, 15, 60, 45.50m, 10m, null, 1);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Fact]
    public void Create_WithNameOverMaxLength_ReturnsFailure()
    {
        var result = Service.Create(
            Guid.NewGuid(), new string('x', Service.NameMaxLength + 1), null, 30, 15, 60, 45.50m, 10m, null, 1);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Fact]
    public void Create_WithDescriptionOverMaxLength_ReturnsFailure()
    {
        var result = Service.Create(
            Guid.NewGuid(), "Haircut", new string('x', Service.DescriptionMaxLength + 1), 30, 15, 60, 45.50m, 10m, null, 1);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Fact]
    public void Create_WithMinDurationGreaterThanMaxDuration_ReturnsFailure()
    {
        var result = Service.Create(Guid.NewGuid(), "Haircut", null, 30, 61, 60, 45.50m, 10m, null, 1);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Fact]
    public void Create_WithDurationOutsideMinMaxRange_ReturnsFailure()
    {
        var result = Service.Create(Guid.NewGuid(), "Haircut", null, 5, 15, 60, 45.50m, 10m, null, 1);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Fact]
    public void Create_WithMaxDurationOverAllowedLimit_ReturnsFailure()
    {
        var result = Service.Create(
            Guid.NewGuid(), "Haircut", null, 30, 15, Service.MaxAllowedDurationMinutes + 1, 45.50m, 10m, null, 1);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Fact]
    public void Create_WithNegativePrice_ReturnsFailure()
    {
        var result = Service.Create(Guid.NewGuid(), "Haircut", null, 30, 15, 60, -0.01m, 10m, null, 1);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Theory]
    [InlineData(-0.01)]
    [InlineData(100.01)]
    public void Create_WithMaxDiscountPercentageOutsideRange_ReturnsFailure(double maxDiscountPercentage)
    {
        var result = Service.Create(
            Guid.NewGuid(), "Haircut", null, 30, 15, 60, 45.50m, (decimal)maxDiscountPercentage, null, 1);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Fact]
    public void Update_WithInvalidValues_ReturnsFailure()
    {
        var service = CreateValidService();

        var result = service.Update("Haircut", null, 30, 61, 60, 45.50m, 10m, null);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.Invalid");
    }

    [Fact]
    public void Update_WhenValidationFailsOnALaterField_LeavesEveryFieldUnchanged()
    {
        var categoryId = Guid.NewGuid();
        var service = CreateValidService(categoryId);
        var originalCategoryId = service.CategoryId;
        var originalName = service.Name;
        var originalDescription = service.Description;
        var originalDuration = service.DurationMinutes;
        var originalMinDuration = service.MinDurationMinutes;
        var originalMaxDuration = service.MaxDurationMinutes;
        var originalPrice = service.Price;
        var originalMaxDiscountPercentage = service.MaxDiscountPercentage;

        // MaxDiscountPercentage is the last field validated by Update - if the
        // entity were mutated field-by-field instead of atomically, every
        // field validated before it (name, description, duration, price)
        // would already be overwritten by the time this fails.
        var result = service.Update(
            "Deep Tissue Massage", null, 90, 60, 120, 90.00m, 150m, Guid.NewGuid());

        result.IsFailure.Should().BeTrue();
        service.CategoryId.Should().Be(originalCategoryId);
        service.Name.Should().Be(originalName);
        service.Description.Should().Be(originalDescription);
        service.DurationMinutes.Should().Be(originalDuration);
        service.MinDurationMinutes.Should().Be(originalMinDuration);
        service.MaxDurationMinutes.Should().Be(originalMaxDuration);
        service.Price.Should().Be(originalPrice);
        service.MaxDiscountPercentage.Should().Be(originalMaxDiscountPercentage);
    }

    [Fact]
    public void SetTags_ReplacesTheTagCollection()
    {
        var service = CreateValidService();
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;

        service.SetTags([tag]);

        service.Tags.Should().ContainSingle().Which.Should().Be(tag);
    }

    [Fact]
    public void SetTags_CalledAgain_ReplacesThePreviousTags()
    {
        var service = CreateValidService();
        var firstTag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
        var secondTag = Tag.Create(Guid.NewGuid(), "Returning", TagColor.Create("#ef4444").Value, null).Value;
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
