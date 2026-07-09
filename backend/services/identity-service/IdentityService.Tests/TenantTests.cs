using IdentityService.Domain.Entities;

namespace IdentityService.Tests;

public class TenantTests
{
    [Fact]
    public void Constructor_WithValidName_SetsIdAndName()
    {
        var id = Guid.NewGuid();

        var tenant = new Tenant(id, "Bella Studio");

        Assert.Equal(id, tenant.Id);
        Assert.Equal("Bella Studio", tenant.Name);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_WithMissingName_Throws(string name)
    {
        var exception = Assert.Throws<ArgumentException>(
            () => new Tenant(Guid.NewGuid(), name));

        Assert.Equal("name", exception.ParamName);
    }
}
