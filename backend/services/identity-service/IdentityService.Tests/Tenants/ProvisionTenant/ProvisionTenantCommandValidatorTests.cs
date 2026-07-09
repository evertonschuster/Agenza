using IdentityService.Application.Tenants.ProvisionTenant;

namespace IdentityService.Tests.Tenants.ProvisionTenant;

public class ProvisionTenantCommandValidatorTests
{
    private readonly ProvisionTenantCommandValidator _validator = new();

    [Fact]
    public void Validate_WithValidCommand_Passes()
    {
        var result = _validator.Validate(new ProvisionTenantCommand("Demo Business", "owner@demo.local", "Passw0rd!"));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEmptyTenantName_Fails()
    {
        var result = _validator.Validate(new ProvisionTenantCommand("", "owner@demo.local", "Passw0rd!"));

        result.IsValid.Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("not-an-email")]
    public void Validate_WithInvalidOwnerEmail_Fails(string email)
    {
        var result = _validator.Validate(new ProvisionTenantCommand("Demo Business", email, "Passw0rd!"));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithEmptyPassword_Fails()
    {
        var result = _validator.Validate(new ProvisionTenantCommand("Demo Business", "owner@demo.local", ""));

        result.IsValid.Should().BeFalse();
    }
}
