using ServicesService.Application.Services.ListServices;

namespace ServicesService.Tests.Services.ListServices;

public class ListServicesQueryValidatorTests
{
    private readonly ListServicesQueryValidator _validator = new();

    [Fact]
    public void Validate_WithDefaultQuery_Passes()
    {
        _validator.Validate(new ListServicesQuery()).IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithPageLessThanOne_ReportsTheBusinessCode()
    {
        var result = _validator.Validate(new ListServicesQuery(Page: 0));

        var error = result.Errors.Should().ContainSingle().Subject;
        error.PropertyName.Should().Be("Page");
        error.ErrorCode.Should().Be("Page.Invalid");
        error.ErrorMessage.Should().Be("A página deve ser maior ou igual a 1.");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public void Validate_WithPageSizeOutOfBounds_ReportsTheBusinessCode(int pageSize)
    {
        var result = _validator.Validate(new ListServicesQuery(PageSize: pageSize));

        var error = result.Errors.Should().ContainSingle().Subject;
        error.PropertyName.Should().Be("PageSize");
        error.ErrorCode.Should().Be("PageSize.Invalid");
        error.ErrorMessage.Should().Be("O tamanho da página deve ser entre 1 e 100.");
    }

    [Fact]
    public void Validate_WithPageSizeAtBounds_Passes()
    {
        _validator.Validate(new ListServicesQuery(PageSize: 1)).IsValid.Should().BeTrue();
        _validator.Validate(new ListServicesQuery(PageSize: 100)).IsValid.Should().BeTrue();
    }
}
