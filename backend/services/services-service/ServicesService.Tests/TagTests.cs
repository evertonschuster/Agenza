using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests;

public class TagTests
{
    private static readonly TagColor Teal = TagColor.Create("#0d9488").Value;

    [Fact]
    public void Create_WithValidValues_TrimsAndSets()
    {
        var id = Guid.NewGuid();

        var result = Tag.Create(id, "  VIP  ", Teal, "  High-value client  ");

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(id);
        result.Value.TenantId.Should().Be(Guid.Empty);
        result.Value.Name.Should().Be("VIP");
        result.Value.Color.Value.Should().Be("#0d9488");
        result.Value.Description.Should().Be("High-value client");
    }

    [Fact]
    public void AssignTenant_WithValidTenant_SetsTenantId()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", Teal, null).Value;
        var tenantId = Guid.NewGuid();

        tag.AssignTenant(tenantId);

        tag.TenantId.Should().Be(tenantId);
    }

    [Fact]
    public void AssignTenant_WithEmptyTenant_Throws()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", Teal, null).Value;

        var act = () => tag.AssignTenant(Guid.Empty);

        act.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankDescription_StoresNull(string? description)
    {
        var result = Tag.Create(Guid.NewGuid(), "VIP", Teal, description);

        result.IsSuccess.Should().BeTrue();
        result.Value.Description.Should().BeNull();
    }

    [Fact]
    public void Update_WithValidValues_ReplacesEveryField()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", Teal, "old").Value;

        var result = tag.Update("  Returning  ", TagColor.Create("#ef4444").Value, null);

        result.IsSuccess.Should().BeTrue();
        tag.Name.Should().Be("Returning");
        tag.Color.Value.Should().Be("#ef4444");
        tag.Description.Should().BeNull();
    }

    [Fact]
    public void Create_WithEmptyName_ReturnsFailure()
    {
        var result = Tag.Create(Guid.NewGuid(), "   ", Teal, null);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Tag.Invalid");
    }

    [Fact]
    public void Create_WithNameOverMaxLength_ReturnsFailure()
    {
        var result = Tag.Create(Guid.NewGuid(), new string('x', Tag.NameMaxLength + 1), Teal, null);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Tag.Invalid");
    }

    [Fact]
    public void Create_WithDescriptionOverMaxLength_ReturnsFailure()
    {
        var result = Tag.Create(Guid.NewGuid(), "VIP", Teal, new string('x', Tag.DescriptionMaxLength + 1));

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Tag.Invalid");
    }

    [Fact]
    public void Update_WithEmptyName_ReturnsFailure()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", Teal, null).Value;

        var result = tag.Update("   ", Teal, null);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Tag.Invalid");
    }

    [Fact]
    public void Update_WhenValidationFailsOnALaterField_LeavesEveryFieldUnchanged()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", Teal, "old").Value;
        var originalName = tag.Name;
        var originalColor = tag.Color;
        var originalDescription = tag.Description;
        var newColor = TagColor.Create("#ef4444").Value;

        // Description is the last field validated by Update - if the entity
        // were mutated field-by-field instead of atomically, Name and Color
        // would already be overwritten by the time this fails.
        var result = tag.Update("Returning", newColor, new string('x', Tag.DescriptionMaxLength + 1));

        result.IsFailure.Should().BeTrue();
        tag.Name.Should().Be(originalName);
        tag.Color.Should().Be(originalColor);
        tag.Description.Should().Be(originalDescription);
    }

    [Fact]
    public void MarkCreated_SetsCreatedAtAndCreatedBy()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", Teal, null).Value;
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        tag.MarkCreated(actorId, now);

        tag.CreatedAt.Should().Be(now);
        tag.CreatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkUpdated_SetsUpdatedAtAndUpdatedBy()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", Teal, null).Value;
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        tag.MarkUpdated(actorId, now);

        tag.UpdatedAt.Should().Be(now);
        tag.UpdatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkDeleted_SetsDeletedAtAndDeletedByAndIsDeleted()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", Teal, null).Value;
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        tag.IsDeleted.Should().BeFalse();

        tag.MarkDeleted(actorId, now);

        tag.DeletedAt.Should().Be(now);
        tag.DeletedBy.Should().Be(actorId);
        tag.IsDeleted.Should().BeTrue();
    }
}

public class TagColorTests
{
    [Fact]
    public void Create_NormalizesCaseAndWhitespace()
    {
        var result = TagColor.Create("  #0D9488  ");

        result.IsSuccess.Should().BeTrue();
        result.Value.Value.Should().Be("#0d9488");
    }

    [Fact]
    public void Palette_HasEightDistinctColors()
    {
        TagColor.Palette.Should().HaveCount(8);
        TagColor.Palette.Distinct().Should().HaveCount(8);
    }

    [Fact]
    public void Create_WithColorOutsidePalette_ReturnsFailure()
    {
        var result = TagColor.Create("#123456");

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Tag.Invalid");
    }
}
