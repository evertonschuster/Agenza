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
}
