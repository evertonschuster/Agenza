using ServicesService.Application.Services.ListServices;

namespace ServicesService.Tests.Services.ListServices;

public class ListServicesQueryValidatorTests
{
    private readonly ListServicesQueryValidator _validator = new();

    [Fact]
    public void Validate_WithDefaultQuery_Passes()
    {
        var result = _validator.Validate(new ListServicesQuery());

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithPageLessThanOne_Fails()
    {
        var result = _validator.Validate(new ListServicesQuery(Page: 0));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithPageSizeBelowOne_Fails()
    {
        var result = _validator.Validate(new ListServicesQuery(PageSize: 0));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithPageSizeAboveOneHundred_Fails()
    {
        var result = _validator.Validate(new ListServicesQuery(PageSize: 101));

        result.IsValid.Should().BeFalse();
    }

    [Fact]
    public void Validate_WithPageSizeAtBounds_Passes()
    {
        _validator.Validate(new ListServicesQuery(PageSize: 1)).IsValid.Should().BeTrue();
        _validator.Validate(new ListServicesQuery(PageSize: 100)).IsValid.Should().BeTrue();
    }
}
