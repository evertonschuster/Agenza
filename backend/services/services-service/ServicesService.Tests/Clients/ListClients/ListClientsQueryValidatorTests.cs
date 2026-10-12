using ServicesService.Application.Clients.ListClients;

namespace ServicesService.Tests.Clients.ListClients;

public class ListClientsQueryValidatorTests
{
    private readonly ListClientsQueryValidator _validator = new();

    public static TheoryData<string, ListClientsQuery, string, string> EveryRule()
    {
        return new TheoryData<string, ListClientsQuery, string, string>
        {
            { "page below one", new ListClientsQuery(Page: 0), "Page", "Paging.PageInvalid" },
            { "negative page", new ListClientsQuery(Page: -3), "Page", "Paging.PageInvalid" },
            { "page whose offset overflows", new ListClientsQuery(Page: int.MaxValue), "Page", "Paging.PageTooLarge" },
            { "page just past the offset limit", new ListClientsQuery(Page: 21_474_838, PageSize: 100), "Page", "Paging.PageTooLarge" },
            { "page size below one", new ListClientsQuery(PageSize: 0), "PageSize", "Paging.PageSizeInvalid" },
            { "page size above the maximum", new ListClientsQuery(PageSize: 101), "PageSize", "Paging.PageSizeInvalid" },
            { "search above the longest searchable value", new ListClientsQuery(Q: new string('a', 255)), "Q", "Client.SearchTooLong" },
            { "unknown status", new ListClientsQuery(Status: "deleted"), "Status", "Client.StatusFilterInvalid" },
            { "numeric status", new ListClientsQuery(Status: "1"), "Status", "Client.StatusFilterInvalid" },
            { "status with surrounding text", new ListClientsQuery(Status: "active,inactive"), "Status", "Client.StatusFilterInvalid" },
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
        _validator.Validate(new ListClientsQuery(Page: 1, PageSize: 1)).IsValid.Should().BeTrue();
        _validator.Validate(new ListClientsQuery(Page: 21_474_837, PageSize: 100)).IsValid.Should().BeTrue();
        _validator.Validate(new ListClientsQuery(PageSize: 100)).IsValid.Should().BeTrue();
        _validator.Validate(new ListClientsQuery(Q: new string('a', 254))).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("active")]
    [InlineData("inactive")]
    [InlineData("all")]
    [InlineData("ACTIVE")]
    [InlineData("All")]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public void Validate_WithAKnownOrBlankStatus_Passes(string? status)
    {
        var result = _validator.Validate(new ListClientsQuery(Status: status));

        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("maria")]
    [InlineData("529.982.247-25")]
    public void Validate_WithAnySearchWithinTheLimit_Passes(string? search)
    {
        var result = _validator.Validate(new ListClientsQuery(Q: search));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithAPageBelowOne_ReportsOnlyThePageRule()
    {
        var result = _validator.Validate(new ListClientsQuery(Page: 0, PageSize: 100));

        result.Errors.Select(error => error.ErrorCode).Should().Equal("Paging.PageInvalid");
    }

    [Fact]
    public void Validate_WithSeveralInvalidMembers_ReportsEachOnItsOwnProperty()
    {
        var result = _validator.Validate(new ListClientsQuery(Page: 0, PageSize: 0, Status: "x"));

        result.Errors.Select(error => (error.PropertyName, error.ErrorCode)).Should().BeEquivalentTo(
        [
            ("Page", "Paging.PageInvalid"),
            ("PageSize", "Paging.PageSizeInvalid"),
            ("Status", "Client.StatusFilterInvalid"),
        ]);
    }

    [Fact]
    public void Validate_MessagesAreWrittenInPortugueseAndNameTheField()
    {
        var result = _validator.Validate(new ListClientsQuery(Page: 0, PageSize: 0, Q: new string('a', 255), Status: "x"));

        result.Errors.Select(error => error.ErrorMessage).Should().BeEquivalentTo(
        [
            "A página deve ser maior ou igual a 1.",
            "O tamanho da página deve ser entre 1 e 100.",
            "A busca deve ter no máximo 254 caracteres.",
            "A situação deve ser active, inactive ou all.",
        ]);
    }
}
