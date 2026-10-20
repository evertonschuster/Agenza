using ServicesService.Application.Tags.ListTags;

namespace ServicesService.Tests.Tags.ListTags;

public class ListTagsQueryValidatorTests
{
    private readonly ListTagsQueryValidator _validator = new();

    public static TheoryData<string, ListTagsQuery, string, string> EveryRule()
    {
        return new TheoryData<string, ListTagsQuery, string, string>
        {
            { "page below one", new ListTagsQuery { Page = 0 }, "Page", "Paging.PageInvalid" },
            { "negative page", new ListTagsQuery { Page = -3 }, "Page", "Paging.PageInvalid" },
            { "smallest page", new ListTagsQuery { Page = int.MinValue }, "Page", "Paging.PageInvalid" },
            { "offset overflow", new ListTagsQuery { Page = int.MaxValue }, "Page", "Paging.PageTooLarge" },
            { "past the offset limit", new ListTagsQuery { Page = 21_474_838, PageSize = 100 }, "Page", "Paging.PageTooLarge" },
            { "size below one", new ListTagsQuery { PageSize = 0 }, "PageSize", "Paging.PageSizeInvalid" },
            { "negative size", new ListTagsQuery { PageSize = -1 }, "PageSize", "Paging.PageSizeInvalid" },
            { "size above maximum", new ListTagsQuery { PageSize = 101 }, "PageSize", "Paging.PageSizeInvalid" },
        };
    }

    [Theory]
    [MemberData(nameof(EveryRule))]
    public void Validate_WithAnInvalidRequest_ReportsTheCodeOnItsProperty(
        string caseName, ListTagsQuery query, string property, string code)
    {
        var result = _validator.Validate(query);

        var error = result.Errors.Should().ContainSingle(caseName).Subject;
        error.PropertyName.Should().Be(property);
        error.ErrorCode.Should().Be(code);
    }

    [Fact]
    public void Validate_WithTheDefaultQuery_Passes()
    {
        _validator.Validate(new ListTagsQuery()).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(1, 1)]
    [InlineData(1, 100)]
    [InlineData(21_474_837, 100)]
    [InlineData(int.MaxValue, 1)]
    public void Validate_WithTheLimitsAtTheirBoundaries_Passes(int page, int pageSize)
    {
        _validator.Validate(new ListTagsQuery { Page = page, PageSize = pageSize }).IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithSeveralInvalidMembers_ReportsEachOnItsPropertyInPortuguese()
    {
        var result = _validator.Validate(new ListTagsQuery { Page = 0, PageSize = 0 });

        result.Errors.Select(error => (error.PropertyName, error.ErrorCode, error.ErrorMessage))
            .Should().BeEquivalentTo(
            [
                ("Page", "Paging.PageInvalid", "A página deve ser maior ou igual a 1."),
                ("PageSize", "Paging.PageSizeInvalid", "O tamanho da página deve ser entre 1 e 100."),
            ]);
    }
}
