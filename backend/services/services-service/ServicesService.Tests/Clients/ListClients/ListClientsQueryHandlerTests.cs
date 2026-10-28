using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Clients;
using ServicesService.Application.Clients.ListClients;

namespace ServicesService.Tests.Clients.ListClients;

public class ListClientsQueryHandlerTests
{
    private readonly IClientRepository _repository = Substitute.For<IClientRepository>();
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly ListClientsQueryHandler _handler;

    public ListClientsQueryHandlerTests()
    {
        _handler = new ListClientsQueryHandler(_repository, _tagRepository);
        Returns([], 0);
    }

    private void Returns(IReadOnlyList<Client> clients, int totalCount)
    {
        _repository
            .ListAsync(Arg.Any<ClientListFilter>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var filter = callInfo.Arg<ClientListFilter>();
                return Task.FromResult(new PagedResult<Client>(clients, totalCount, filter.Page, filter.PageSize));
            });
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

    private static SearchText SearchTextOf(string raw)
    {
        return SearchText.Create(raw).Value;
    }

    private static Client MinimalClient(string name)
    {
        return Client.Create(ClientTestData.Data(ClientTestData.Name(name)), ClientTestData.Today).Value;
    }

    private async Task AssertListed(string? text, string? cpfDigits, ClientStatus? status, int page = 1, int pageSize = 20)
    {
        await _repository.Received(1).ListAsync(
            Arg.Is<ClientListFilter>(filter => FilterIs(filter, text, cpfDigits, status, page, pageSize)),
            Arg.Any<CancellationToken>());
    }

    private static bool FilterIs(ClientListFilter filter, string? text, string? cpfDigits, ClientStatus? status, int page, int pageSize)
    {
        return filter.Page == page
            && filter.PageSize == pageSize
            && filter.Text == text
            && filter.CpfDigits == cpfDigits
            && filter.Status == status;
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
        item.Status.Should().Be(ClientStatus.Active);
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

        var result = await _handler.Handle(new ListClientsQuery(Status: ClientStatusFilter.All), CancellationToken.None);

        result.Value.Items.Should().ContainSingle().Which.Status.Should().Be(ClientStatus.Inactive);
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

        var result = await _handler.Handle(new ListClientsQuery { Page = 2, PageSize = 2 }, CancellationToken.None);

        result.Value.Page.Should().Be(2);
        result.Value.PageSize.Should().Be(2);
        result.Value.TotalCount.Should().Be(7);
        result.Value.Items.Should().HaveCount(2);
        await AssertListed(null, null, null, page: 2, pageSize: 2);
    }

    [Fact]
    public async Task Handle_WithAPagePastTheLast_ReturnsAnEmptyPageAndTheTotal()
    {
        Returns([], 3);

        var result = await _handler.Handle(new ListClientsQuery { Page = 9, PageSize = 20 }, CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Items.Should().BeEmpty();
        result.Value.TotalCount.Should().Be(3);
        result.Value.Page.Should().Be(9);
    }

    [Fact]
    public async Task Handle_WithoutFilters_AsksForEveryoneWithoutSearch()
    {
        await _handler.Handle(new ListClientsQuery(), CancellationToken.None);

        await AssertListed(null, null, null);
    }

    [Theory]
    [InlineData("  Maria SILVA ", "maria silva")]
    [InlineData("MARIA@Example.COM", "maria@example.com")]
    [InlineData("josé", "josé")]
    [InlineData("50%_off", "50%_off")]
    public async Task Handle_SearchesTheNormalizedTextOfTheSearch(string search, string expectedText)
    {
        await _handler.Handle(new ListClientsQuery(Search: SearchTextOf(search)), CancellationToken.None);

        await AssertListed(expectedText, null, null);
    }

    [Theory]
    [InlineData("529.982.247-25", "529.982.247-25", "52998224725")]
    [InlineData("123", "123", "123")]
    public async Task Handle_WithDigitsAndCpfMask_AlsoSearchesTheCpfWithoutTheMask(string search, string expectedText, string expectedDigits)
    {
        await _handler.Handle(new ListClientsQuery(Search: SearchTextOf(search)), CancellationToken.None);

        await AssertListed(expectedText, expectedDigits, null);
    }

    [Theory]
    [InlineData("maria")]
    [InlineData("ana-lima")]
    public async Task Handle_WithTextThatIsNotADigitSequence_DoesNotSearchTheCpf(string search)
    {
        await _handler.Handle(new ListClientsQuery(Search: SearchTextOf(search)), CancellationToken.None);

        await AssertListed(search, null, null);
    }

    [Fact]
    public async Task Handle_CombinesTheSearchWithTheStatusFilter()
    {
        await _handler.Handle(new ListClientsQuery(Search: SearchTextOf("Silva"), Status: ClientStatusFilter.Inactive) { Page = 3, PageSize = 50 }, CancellationToken.None);

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

    [Fact]
    public async Task Handle_ReadsTheTagsOfTheWholePageOnceAndGivesEachClientItsOwn()
    {
        var vip = ClientTestData.Tag("VIP", "#0d9488");
        var allergy = ClientTestData.Tag("Alergia", "#ef4444");
        var ana = Client.Create(ClientTestData.Data(ClientTestData.Name("Ana"), tagIds: [vip.Id, allergy.Id]), ClientTestData.Today).Value;
        var bia = Client.Create(ClientTestData.Data(ClientTestData.Name("Bia"), tagIds: [vip.Id]), ClientTestData.Today).Value;
        Returns([ana, bia, MinimalClient("Carla")], 3);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns([vip, allergy]);

        var result = await _handler.Handle(new ListClientsQuery(), CancellationToken.None);

        var items = result.Value.Items;
        items[0].Tags.Select(tag => tag.Name).Should().Equal("Alergia", "VIP");
        items[1].Tags.Select(tag => tag.Id).Should().Equal(vip.Id);
        items[2].Tags.Should().BeEmpty();
        await _tagRepository.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 2 && ids.Contains(vip.Id) && ids.Contains(allergy.Id)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ForAPageWithoutTags_DoesNotReadTags()
    {
        Returns([MinimalClient("Ana")], 1);

        var result = await _handler.Handle(new ListClientsQuery(), CancellationToken.None);

        result.Value.Items.Should().ContainSingle().Which.Tags.Should().BeEmpty();
        await _tagRepository.DidNotReceive().GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }
}
