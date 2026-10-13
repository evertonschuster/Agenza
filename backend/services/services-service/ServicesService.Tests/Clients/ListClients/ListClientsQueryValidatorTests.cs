using ServicesService.Application.Clients.ListClients;

namespace ServicesService.Tests.Clients.ListClients;

public class ListClientsQueryValidatorTests
{
    private readonly ListClientsQueryValidator _validator = new();

    public static TheoryData<string, ListClientsQuery, string, string> EveryRule()
    {
        return new TheoryData<string, ListClientsQuery, string, string>
        {
            { "page below one", new ListClientsQuery { Page = 0 }, "Page", "Paging.PageInvalid" },
            { "negative page", new ListClientsQuery { Page = -3 }, "Page", "Paging.PageInvalid" },
            { "page whose offset overflows", new ListClientsQuery { Page = int.MaxValue }, "Page", "Paging.PageTooLarge" },
            { "page just past the offset limit", new ListClientsQuery { Page = 21_474_838, PageSize = 100 }, "Page", "Paging.PageTooLarge" },
            { "page size below one", new ListClientsQuery { PageSize = 0 }, "PageSize", "Paging.PageSizeInvalid" },
            { "page size above the maximum", new ListClientsQuery { PageSize = 101 }, "PageSize", "Paging.PageSizeInvalid" },
        };
    }

    [Theory]
    [MemberData(nameof(EveryRule))]
    public void Validate_WithAnInvalidRequest_RejectsItWithTheRulesCodeOnItsProperty(
        string caseName,
        ListClientsQuery query,
        string property,
        string code)
    {
        var result = _validator.Validate(query);

        var error = result.Errors.Should().ContainSingle(caseName).Subject;
        error.PropertyName.Should().Be(property);
        error.ErrorCode.Should().Be(code);
    }

    [Fact]
    public void Validate_WithTheDefaultQuery_Passes()
    {
        var result = _validator.Validate(new ListClientsQuery());

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithEveryLimitAtItsBoundary_Passes()
    {
        _validator.Validate(new ListClientsQuery { Page = 1, PageSize = 1 }).IsValid.Should().BeTrue();
        _validator.Validate(new ListClientsQuery { Page = 21_474_837, PageSize = 100 }).IsValid.Should().BeTrue();
        _validator.Validate(new ListClientsQuery { PageSize = 100 }).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(ClientStatusFilter.Active)]
    [InlineData(ClientStatusFilter.Inactive)]
    [InlineData(ClientStatusFilter.All)]
    [InlineData(null)]
    public void Validate_WithAMemberOfTheEnumOrNoStatus_Passes(ClientStatusFilter? status)
    {
        var result = _validator.Validate(new ListClientsQuery(Status: status));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithAPageBelowOne_ReportsOnlyThePageRule()
    {
        var result = _validator.Validate(new ListClientsQuery { Page = 0, PageSize = 100 });

        result.Errors.Select(error => error.ErrorCode).Should().Equal("Paging.PageInvalid");
    }

    [Fact]
    public void Validate_WithSeveralInvalidMembers_ReportsEachOnItsOwnProperty()
    {
        var result = _validator.Validate(new ListClientsQuery { Page = 0, PageSize = 0 });

        result.Errors.Select(error => (error.PropertyName, error.ErrorCode)).Should().BeEquivalentTo(
        [
            ("Page", "Paging.PageInvalid"),
            ("PageSize", "Paging.PageSizeInvalid"),
        ]);
    }

    [Fact]
    public void Validate_MessagesAreWrittenInPortugueseAndNameTheField()
    {
        var result = _validator.Validate(new ListClientsQuery { Page = 0, PageSize = 0 });

        result.Errors.Select(error => error.ErrorMessage).Should().BeEquivalentTo(
        [
            "A página deve ser maior ou igual a 1.",
            "O tamanho da página deve ser entre 1 e 100.",
        ]);
    }
}
