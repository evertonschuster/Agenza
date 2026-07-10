using ServicesService.Domain.Entities;
using ServicesService.Domain.Exceptions;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests;

public class TagTests
{
    private static readonly TagColor Teal = TagColor.From("#0d9488");

    [Fact]
    public void Constructor_WithValidValues_TrimsAndSets()
    {
        var id = Guid.NewGuid();
        var tenantId = Guid.NewGuid();

        var tag = new Tag(id, tenantId, "  VIP  ", Teal, "  High-value client  ");

        tag.Id.Should().Be(id);
        tag.TenantId.Should().Be(tenantId);
        tag.Name.Should().Be("VIP");
        tag.Color.Value.Should().Be("#0d9488");
        tag.Description.Should().Be("High-value client");
    }

    [Fact]
    public void Constructor_WithEmptyTenant_DoesNotThrow()
    {
        // AuditableEntitySaveChangesInterceptor assigns the tenant on
        // save (docs/adr/0008) - the constructor itself no longer
        // enforces it, AssignTenant does.
        var act = () => new Tag(Guid.NewGuid(), Guid.Empty, "VIP", Teal, null);

        act.Should().NotThrow();
    }

    [Fact]
    public void AssignTenant_WithValidTenant_SetsTenantId()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.Empty, "VIP", Teal, null);
        var tenantId = Guid.NewGuid();

        tag.AssignTenant(tenantId);

        tag.TenantId.Should().Be(tenantId);
    }

    [Fact]
    public void AssignTenant_WithEmptyTenant_Throws()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.Empty, "VIP", Teal, null);

        var act = () => tag.AssignTenant(Guid.Empty);

        act.Should().Throw<InvalidTagException>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_WithMissingName_Throws(string name)
    {
        var act = () => new Tag(Guid.NewGuid(), Guid.NewGuid(), name, Teal, null);

        act.Should().Throw<InvalidTagException>();
    }

    [Fact]
    public void Constructor_WithNameOverMaxLength_Throws()
    {
        var name = new string('x', Tag.NameMaxLength + 1);

        var act = () => new Tag(Guid.NewGuid(), Guid.NewGuid(), name, Teal, null);

        act.Should().Throw<InvalidTagException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_WithBlankDescription_StoresNull(string? description)
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", Teal, description);

        tag.Description.Should().BeNull();
    }

    [Fact]
    public void Constructor_WithDescriptionOverMaxLength_Throws()
    {
        var description = new string('x', Tag.DescriptionMaxLength + 1);

        var act = () => new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", Teal, description);

        act.Should().Throw<InvalidTagException>();
    }

    [Fact]
    public void Update_WithValidValues_ReplacesEveryField()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", Teal, "old");

        tag.Update("  Returning  ", TagColor.From("#ef4444"), null);

        tag.Name.Should().Be("Returning");
        tag.Color.Value.Should().Be("#ef4444");
        tag.Description.Should().BeNull();
    }

    [Fact]
    public void Update_WithInvalidName_ThrowsAndKeepsState()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", Teal, null);

        var act = () => tag.Update("", Teal, null);

        act.Should().Throw<InvalidTagException>();
        tag.Name.Should().Be("VIP");
    }

    [Fact]
    public void MarkCreated_SetsCreatedAtAndCreatedBy()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", Teal, null);
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        tag.MarkCreated(actorId, now);

        tag.CreatedAt.Should().Be(now);
        tag.CreatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkUpdated_SetsUpdatedAtAndUpdatedBy()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", Teal, null);
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        tag.MarkUpdated(actorId, now);

        tag.UpdatedAt.Should().Be(now);
        tag.UpdatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkDeleted_SetsDeletedAtAndDeletedByAndIsDeleted()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", Teal, null);
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
    public void From_NormalizesCaseAndWhitespace()
    {
        var color = TagColor.From("  #0D9488  ");

        color.Value.Should().Be("#0d9488");
    }

    [Theory]
    [InlineData("#123456")] // not in the palette
    [InlineData("teal")]
    [InlineData("")]
    public void From_RejectsValuesOutsideThePalette(string value)
    {
        var act = () => TagColor.From(value);

        act.Should().Throw<InvalidTagException>();
    }

    [Fact]
    public void Palette_HasEightDistinctColors()
    {
        TagColor.Palette.Should().HaveCount(8);
        TagColor.Palette.Distinct().Should().HaveCount(8);
    }
}
