using ServicesService.Application.Services.ListServices;

namespace ServicesService.Tests.Services.ListServices;

public class ListServicesQueryValidatorTests
{
    private readonly ListServicesQueryValidator _validator = new();

    public static TheoryData<string, ListServicesQuery, string, string> EveryRule()
    {
        return new TheoryData<string, ListServicesQuery, string, string>
        {
            { "page below one", new ListServicesQuery { Page = 0 }, "Page", "Paging.PageInvalid" },
            { "negative page", new ListServicesQuery { Page = -3 }, "Page", "Paging.PageInvalid" },
            { "page whose offset overflows", new ListServicesQuery { Page = int.MaxValue }, "Page", "Paging.PageTooLarge" },
            { "page just past the offset limit", new ListServicesQuery { Page = 21_474_838, PageSize = 100 }, "Page", "Paging.PageTooLarge" },
            { "page size below one", new ListServicesQuery { PageSize = 0 }, "PageSize", "Paging.PageSizeInvalid" },
            { "page size above the maximum", new ListServicesQuery { PageSize = 101 }, "PageSize", "Paging.PageSizeInvalid" },
        };
    }

    [Theory]
    [MemberData(nameof(EveryRule))]
    public void Validate_WithAnInvalidRequest_RejectsItWithTheRulesCodeOnItsProperty(
        string caseName,
        ListServicesQuery query,
        string property,
        string code)
    {
        var result = _validator.Validate(query);

        var error = result.Errors.Should().ContainSingle(caseName).Subject;
        error.PropertyName.Should().Be(property);
        error.ErrorCode.Should().Be(code);
    }

    [Fact]
    public void Validate_WithDefaultQuery_Passes()
    {
        var result = _validator.Validate(new ListServicesQuery());

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEveryLimitAtItsBoundary_Passes()
    {
        _validator.Validate(new ListServicesQuery { Page = 1, PageSize = 1 }).IsValid.Should().BeTrue();
        _validator.Validate(new ListServicesQuery { PageSize = 100 }).IsValid.Should().BeTrue();
        _validator.Validate(new ListServicesQuery { Page = 21_474_837, PageSize = 100 }).IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithAPageBelowOne_ReportsOnlyThePageRule()
    {
        var result = _validator.Validate(new ListServicesQuery { Page = 0, PageSize = 100 });

        result.Errors.Select(error => error.ErrorCode).Should().Equal("Paging.PageInvalid");
    }

    [Fact]
    public void Validate_MessagesAreWrittenInPortugueseAndNameTheField()
    {
        var result = _validator.Validate(new ListServicesQuery { Page = 0, PageSize = 0 });

        result.Errors.Select(error => error.ErrorMessage).Should().BeEquivalentTo(
        [
            "A página deve ser maior ou igual a 1.",
            "O tamanho da página deve ser entre 1 e 100.",
        ]);
    }
}
