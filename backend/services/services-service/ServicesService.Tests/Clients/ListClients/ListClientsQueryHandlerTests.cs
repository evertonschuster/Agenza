using ServicesService.Application.Abstractions;
using ServicesService.Application.Clients.ListClients;

namespace ServicesService.Tests.Clients.ListClients;

public class ListClientsQueryHandlerTests
{
    private readonly IClientRepository _repository = Substitute.For<IClientRepository>();
    private readonly ListClientsQueryHandler _handler;

    public ListClientsQueryHandlerTests()
    {
        _handler = new ListClientsQueryHandler(_repository);
        Returns([], 0);
    }

    private void Returns(IReadOnlyList<Client> clients, int totalCount)
    {
        _repository
            .ListAsync(
                Arg.Any<int>(),
                Arg.Any<int>(),
                Arg.Any<string?>(),
                Arg.Any<string?>(),
                Arg.Any<ClientStatus?>(),
                Arg.Any<CancellationToken>())
            .Returns(Task.FromResult((clients, totalCount)));
    }

    private static Client CompleteClient()
    {
        return Client.Create(
            ClientTestData.Data(
                ClientTestData.Name("Paula Rocha"),
                birthDate: ClientTestData.Birth(new DateOnly(2015, 3, 10)),
                phone: ClientTestData.Phone(),
                email: ClientTestData.Email("paula@example.com"),
                cpf: ClientTestData.Cpf(),
                notes: ClientTestData.Notes(),
                guardians: [ClientTestData.Guardian("Ana Souza", "Mãe")],
                referenceContacts: [ClientTestData.ReferenceContact(ContactPurpose.Emergency)]),
            ClientTestData.Today).Value;
    }

    private static Client MinimalClient(string name)
    {
        return Client.Create(ClientTestData.Data(ClientTestData.Name(name)), ClientTestData.Today).Value;
    }

    private async Task AssertListed(string? text, string? cpfDigits, ClientStatus? status, int page = 1, int pageSize = 20)
    {
        await _repository.Received(1).ListAsync(page, pageSize, text, cpfDigits, status, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReturnsEveryListFieldOfTheClientWithItsWholeCpf()
    {
        var client = CompleteClient();
        Returns([client], 1);

        var result = await _handler.Handle(new ListClientsQuery(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var item = result.Value.Items.Should().ContainSingle().Subject;
        item.Id.Should().Be(client.Id);
        item.FullName.Should().Be("Paula Rocha");
        item.BirthDate.Should().Be(new DateOnly(2015, 3, 10));
        item.Phone.Should().Be("(11) 99999-0000");
        item.Email.Should().Be("paula@example.com");
        item.Cpf.Should().Be("52998224725");
        item.Status.Should().Be("active");
    }

    [Fact]
    public async Task Handle_ForAClientWithOnlyTheRequiredFields_ReturnsNullForTheOptionalOnes()
    {
        Returns([MinimalClient("Paula Rocha")], 1);

        var result = await _handler.Handle(new ListClientsQuery(), CancellationToken.None);

        var item = result.Value.Items.Should().ContainSingle().Subject;
        item.BirthDate.Should().BeNull();
        item.Phone.Should().BeNull();
        item.Email.Should().BeNull();
        item.Cpf.Should().BeNull();
    }

    [Fact]
    public async Task Handle_ForAnInactiveClient_ReturnsTheInactiveSituation()
    {
        var client = MinimalClient("Paula Rocha");
        client.Inactivate();
        Returns([client], 1);

        var result = await _handler.Handle(new ListClientsQuery(Status: "all"), CancellationToken.None);

        result.Value.Items.Should().ContainSingle().Which.Status.Should().Be("inactive");
    }

    [Fact]
    public async Task Handle_KeepsTheOrderTheRepositoryReturned()
    {
        Returns([MinimalClient("Ana"), MinimalClient("Bia"), MinimalClient("Carla")], 3);

        var result = await _handler.Handle(new ListClientsQuery(), CancellationToken.None);

        result.Value.Items.Select(item => item.FullName).Should().Equal("Ana", "Bia", "Carla");
    }

    [Fact]
    public async Task Handle_EchoesThePageTheTotalAndThePageSize()
    {
        Returns([MinimalClient("Ana"), MinimalClient("Bia")], 7);

        var result = await _handler.Handle(new ListClientsQuery(Page: 2, PageSize: 2), CancellationToken.None);

        result.Value.Page.Should().Be(2);
        result.Value.PageSize.Should().Be(2);
        result.Value.TotalCount.Should().Be(7);
        result.Value.Items.Should().HaveCount(2);
        await AssertListed(null, null, ClientStatus.Active, page: 2, pageSize: 2);
    }

    [Fact]
    public async Task Handle_WithAPagePastTheLast_ReturnsAnEmptyPageAndTheTotal()
    {
        Returns([], 3);

        var result = await _handler.Handle(new ListClientsQuery(Page: 9, PageSize: 20), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().BeEmpty();
        result.Value.TotalCount.Should().Be(3);
        result.Value.Page.Should().Be(9);
    }

    [Fact]
    public async Task Handle_WithoutFilters_AsksForTheActiveOnesWithoutSearch()
    {
        await _handler.Handle(new ListClientsQuery(), CancellationToken.None);

        await AssertListed(null, null, ClientStatus.Active);
    }

    [Theory]
    [InlineData("active", ClientStatus.Active)]
    [InlineData("ACTIVE", ClientStatus.Active)]
    [InlineData("inactive", ClientStatus.Inactive)]
    [InlineData("Inactive", ClientStatus.Inactive)]
    [InlineData(null, ClientStatus.Active)]
    [InlineData("", ClientStatus.Active)]
    [InlineData("  ", ClientStatus.Active)]
    public async Task Handle_MapsTheStatusFilterToTheClientStatus(string? status, ClientStatus expected)
    {
        await _handler.Handle(new ListClientsQuery(Status: status), CancellationToken.None);

        await AssertListed(null, null, expected);
    }

    [Theory]
    [InlineData("all")]
    [InlineData("ALL")]
    public async Task Handle_WithTheAllFilter_AsksForNoStatusRestriction(string status)
    {
        await _handler.Handle(new ListClientsQuery(Status: status), CancellationToken.None);

        await AssertListed(null, null, null);
    }

    [Theory]
    [InlineData("  Maria SILVA ", "maria silva")]
    [InlineData("MARIA@Example.COM", "maria@example.com")]
    [InlineData("josé", "josé")]
    [InlineData("50%_off", "50%_off")]
    public async Task Handle_SearchesTheTrimmedLowercaseText(string search, string expectedText)
    {
        await _handler.Handle(new ListClientsQuery(Q: search), CancellationToken.None);

        await AssertListed(expectedText, null, ClientStatus.Active);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Handle_WithABlankSearch_DoesNotSearch(string? search)
    {
        await _handler.Handle(new ListClientsQuery(Q: search), CancellationToken.None);

        await AssertListed(null, null, ClientStatus.Active);
    }

    [Theory]
    [InlineData("529.982.247-25", "529.982.247-25", "52998224725")]
    [InlineData("52998224725", "52998224725", "52998224725")]
    [InlineData(" 529 982 247 25 ", "529 982 247 25", "52998224725")]
    [InlineData("123", "123", "123")]
    [InlineData("456.789", "456.789", "456789")]
    public async Task Handle_WithDigitsAndCpfMask_AlsoSearchesTheCpfWithoutTheMask(string search, string expectedText, string expectedDigits)
    {
        await _handler.Handle(new ListClientsQuery(Q: search), CancellationToken.None);

        await AssertListed(expectedText, expectedDigits, ClientStatus.Active);
    }

    [Theory]
    [InlineData("maria")]
    [InlineData("maria.silva@example.com")]
    [InlineData("ana-lima")]
    [InlineData("a1")]
    [InlineData("529.982.247-2x")]
    [InlineData(".")]
    [InlineData("-")]
    public async Task Handle_WithTextThatIsNotADigitSequence_DoesNotSearchTheCpf(string search)
    {
        await _handler.Handle(new ListClientsQuery(Q: search), CancellationToken.None);

        await AssertListed(search, null, ClientStatus.Active);
    }

    [Fact]
    public async Task Handle_CombinesTheSearchWithTheStatusFilter()
    {
        await _handler.Handle(new ListClientsQuery(Page: 3, PageSize: 50, Q: "Silva", Status: "inactive"), CancellationToken.None);

        await AssertListed("silva", null, ClientStatus.Inactive, page: 3, pageSize: 50);
    }

    [Fact]
    public async Task Handle_OnlyReads()
    {
        await _handler.Handle(new ListClientsQuery(), CancellationToken.None);

        await _repository.DidNotReceive().GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>());
        await _repository.DidNotReceive().UpdateAsync(Arg.Any<Client>(), Arg.Any<CancellationToken>());
        _repository.DidNotReceive().Add(Arg.Any<Client>());
    }
}
