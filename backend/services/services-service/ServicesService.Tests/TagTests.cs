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

        Assert.Equal(id, tag.Id);
        Assert.Equal(tenantId, tag.TenantId);
        Assert.Equal("VIP", tag.Name);
        Assert.Equal("#0d9488", tag.Color.Value);
        Assert.Equal("High-value client", tag.Description);
    }

    [Fact]
    public void Constructor_WithEmptyTenant_Throws()
    {
        Assert.Throws<InvalidTagException>(
            () => new Tag(Guid.NewGuid(), Guid.Empty, "VIP", Teal, null));
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_WithMissingName_Throws(string name)
    {
        Assert.Throws<InvalidTagException>(
            () => new Tag(Guid.NewGuid(), Guid.NewGuid(), name, Teal, null));
    }

    [Fact]
    public void Constructor_WithNameOverMaxLength_Throws()
    {
        var name = new string('x', Tag.NameMaxLength + 1);

        Assert.Throws<InvalidTagException>(
            () => new Tag(Guid.NewGuid(), Guid.NewGuid(), name, Teal, null));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_WithBlankDescription_StoresNull(string? description)
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", Teal, description);

        Assert.Null(tag.Description);
    }

    [Fact]
    public void Constructor_WithDescriptionOverMaxLength_Throws()
    {
        var description = new string('x', Tag.DescriptionMaxLength + 1);

        Assert.Throws<InvalidTagException>(
            () => new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", Teal, description));
    }

    [Fact]
    public void Update_WithValidValues_ReplacesEveryField()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", Teal, "old");

        tag.Update("  Returning  ", TagColor.From("#ef4444"), null);

        Assert.Equal("Returning", tag.Name);
        Assert.Equal("#ef4444", tag.Color.Value);
        Assert.Null(tag.Description);
    }

    [Fact]
    public void Update_WithInvalidName_ThrowsAndKeepsState()
    {
        var tag = new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", Teal, null);

        Assert.Throws<InvalidTagException>(() => tag.Update("", Teal, null));
        Assert.Equal("VIP", tag.Name);
    }
}

public class TagColorTests
{
    [Fact]
    public void From_NormalizesCaseAndWhitespace()
    {
        var color = TagColor.From("  #0D9488  ");

        Assert.Equal("#0d9488", color.Value);
    }

    [Theory]
    [InlineData("#123456")] // not in the palette
    [InlineData("teal")]
    [InlineData("")]
    public void From_RejectsValuesOutsideThePalette(string value)
    {
        Assert.Throws<InvalidTagException>(() => TagColor.From(value));
    }

    [Fact]
    public void Palette_HasEightDistinctColors()
    {
        Assert.Equal(8, TagColor.Palette.Count);
        Assert.Equal(8, TagColor.Palette.Distinct().Count());
    }
}
