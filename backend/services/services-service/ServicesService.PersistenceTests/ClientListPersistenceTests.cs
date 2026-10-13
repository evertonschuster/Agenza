using Admin.SharedKernel;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Clients;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Repositories;

namespace ServicesService.PersistenceTests;

public class ClientListPersistenceTests
{
    private const string MariaCpf = "52998224725";
    private const string JoseCpf = "12345678909";
    private const string PauloCpf = "11144477735";
    private static readonly DateOnly Today = new(2026, 10, 12);

    private static Client NewClient(string fullName, string? cpf = null, string? email = null)
    {
        var data = new ClientData(
            FullName.Create(fullName).Value,
            null,
            null,
            email is null ? null : EmailAddress.Create(email).Value,
            cpf is null ? null : CpfNumber.Create(cpf).Value,
            null,
            [],
            []);
        return Client.Create(data, Today).Value;
    }

    private static async Task Save(ServicesDataContext context, Client client)
    {
        context.Clients.Add(client);
        var entry = context.Entry(client);
        entry.Property<string>("NameNormalized").CurrentValue = client.FullName.Value.ToLowerInvariant();
        entry.Property<string>("EmailNormalized").CurrentValue = client.Email?.Value.ToLowerInvariant()!;
        entry.Property<string>("CpfNormalized").CurrentValue = client.Cpf?.Value!;
        await context.SaveChangesAsync();
    }

    private static async Task<IReadOnlyList<Client>> SaveAll(string databaseName, Guid tenantId, params Client[] clients)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        foreach (var client in clients)
        {
            await Save(context, client);
        }

        return clients;
    }

    private static async Task SetStatus(string databaseName, Guid tenantId, Guid clientId, ClientStatus status)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var tracked = await context.Clients.AsTracking().SingleAsync(c => c.Id == clientId);
        context.Entry(tracked).Property(c => c.Status).CurrentValue = status;
        await context.SaveChangesAsync();
    }

    private static async Task SoftDelete(string databaseName, Guid tenantId, Guid clientId)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var tracked = await context.Clients.AsTracking().SingleAsync(c => c.Id == clientId);
        context.Clients.Remove(tracked);
        await context.SaveChangesAsync();
    }

    private static async Task<PagedResult<Client>> List(
        string databaseName,
        Guid tenantId,
        int page = 1,
        int pageSize = 20,
        string? search = null,
        ClientStatus? status = null)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var searchText = search is null ? null : SearchText.Create(search).Value;
        var filter = ClientListFilter.Create(page, pageSize, searchText, status);
        return await new ClientRepository(context).ListAsync(filter, CancellationToken.None);
    }

    private static string[] Names(PagedResult<Client> page)
    {
        return page.Items.Select(client => client.FullName.Value).ToArray();
    }

    [Fact]
    public async Task List_NeverReturnsNorCountsAnotherTenantsClients()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        await SaveAll(databaseName, tenantA, NewClient("Ana Lima"), NewClient("Bruno Dias"));
        await SaveAll(databaseName, tenantB, NewClient("Carla Souza", MariaCpf, "carla@example.com"));

        var asA = await List(databaseName, tenantA, status: null);
        var asB = await List(databaseName, tenantB, status: null);

        Names(asA).Should().Equal("Ana Lima", "Bruno Dias");
        asA.TotalCount.Should().Be(2);
        Names(asB).Should().Equal("Carla Souza");
        asB.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task List_NeverMatchesAnotherTenantsClientBySearchByName_ByEmailNorByCpf()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        await SaveAll(databaseName, tenantA, NewClient("Ana Lima"));
        await SaveAll(databaseName, tenantB, NewClient("Maria Souza", MariaCpf, "maria@example.com"));

        var byName = await List(databaseName, tenantA, search: "maria");
        var byEmail = await List(databaseName, tenantA, search: "example.com");
        var byCpf = await List(databaseName, tenantA, search: MariaCpf);

        byName.Items.Should().BeEmpty();
        byName.TotalCount.Should().Be(0);
        byEmail.TotalCount.Should().Be(0);
        byCpf.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task List_WithNoTenantInContext_ReturnsNothing()
    {
        var databaseName = Guid.NewGuid().ToString();
        await SaveAll(databaseName, Guid.NewGuid(), NewClient("Ana Lima"));
        var tenantProvider = Substitute.For<ICurrentTenantProvider>();
        tenantProvider.TryGetTenantId(out Arg.Any<Guid>()).Returns(false);
        var options = new DbContextOptionsBuilder<ServicesDataContext>().UseInMemoryDatabase(databaseName).Options;
        await using var tenantlessContext = new ServicesDataContext(options, tenantProvider);

        var page = await new ClientRepository(tenantlessContext)
            .ListAsync(ClientListFilter.Create(1, 20, null, null), CancellationToken.None);

        page.Items.Should().BeEmpty();
        page.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task List_NeverReturnsNorCountsASoftDeletedClient_EvenWhenItMatchesTheSearch()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var kept = NewClient("Ana Lima", MariaCpf);
        var deleted = NewClient("Ana Dias", JoseCpf);
        await SaveAll(databaseName, tenantId, kept, deleted);
        await SoftDelete(databaseName, tenantId, deleted.Id);

        var all = await List(databaseName, tenantId);
        var searched = await List(databaseName, tenantId, search: "ana");
        var byCpf = await List(databaseName, tenantId, search: JoseCpf);

        Names(all).Should().Equal("Ana Lima");
        all.TotalCount.Should().Be(1);
        Names(searched).Should().Equal("Ana Lima");
        searched.TotalCount.Should().Be(1);
        byCpf.Items.Should().BeEmpty();
        byCpf.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task List_FiltersBySituation_AndAllIncludesActiveAndInactive()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var active = NewClient("Ana Lima");
        var inactive = NewClient("Bruno Dias");
        var other = NewClient("Carla Souza");
        await SaveAll(databaseName, tenantId, active, inactive, other);
        await SetStatus(databaseName, tenantId, inactive.Id, ClientStatus.Inactive);

        var onlyActive = await List(databaseName, tenantId, status: ClientStatus.Active);
        var onlyInactive = await List(databaseName, tenantId, status: ClientStatus.Inactive);
        var everyone = await List(databaseName, tenantId, status: null);

        Names(onlyActive).Should().Equal("Ana Lima", "Carla Souza");
        onlyActive.TotalCount.Should().Be(2);
        Names(onlyInactive).Should().Equal("Bruno Dias");
        onlyInactive.TotalCount.Should().Be(1);
        Names(everyone).Should().Equal("Ana Lima", "Bruno Dias", "Carla Souza");
        everyone.TotalCount.Should().Be(3);
    }

    [Fact]
    public async Task List_OrdersByTheNormalizedNameNotByTheTypedCasing()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        await SaveAll(
            databaseName,
            tenantId,
            NewClient("bruno Dias"),
            NewClient("Carla Souza"),
            NewClient("ANA Lima"));

        var page = await List(databaseName, tenantId);

        Names(page).Should().Equal("ANA Lima", "bruno Dias", "Carla Souza");
    }

    [Fact]
    public async Task List_BreaksATieOfTheSameNameById()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var clients = Enumerable.Range(0, 6).Select(_ => NewClient("Maria Souza")).ToArray();
        await SaveAll(databaseName, tenantId, clients);

        var page = await List(databaseName, tenantId);

        page.Items.Select(client => client.Id).Should().Equal(clients.Select(client => client.Id).Order());
    }

    [Fact]
    public async Task List_PagesWithoutRepeatingOrOmittingARecord()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var clients = Enumerable.Range(0, 7)
            .Select(index => NewClient(index % 2 == 0 ? "Maria Souza" : $"Pessoa {index}"))
            .ToArray();
        await SaveAll(databaseName, tenantId, clients);

        var first = await List(databaseName, tenantId, page: 1, pageSize: 3);
        var second = await List(databaseName, tenantId, page: 2, pageSize: 3);
        var third = await List(databaseName, tenantId, page: 3, pageSize: 3);
        var past = await List(databaseName, tenantId, page: 4, pageSize: 3);

        first.Items.Should().HaveCount(3);
        second.Items.Should().HaveCount(3);
        third.Items.Should().HaveCount(1);
        past.Items.Should().BeEmpty();
        new[] { first, second, third, past }.Select(page => page.TotalCount).Should().OnlyContain(total => total == 7);
        new[] { first, second, third, past }.Select(page => (page.Page, page.PageSize)).Should().Equal((1, 3), (2, 3), (3, 3), (4, 3));
        var seen = first.Items.Concat(second.Items).Concat(third.Items).Select(client => client.Id).ToArray();
        seen.Should().OnlyHaveUniqueItems();
        seen.Should().BeEquivalentTo(clients.Select(client => client.Id));
        var onePage = await List(databaseName, tenantId, page: 1, pageSize: 20);
        seen.Should().Equal(onePage.Items.Select(client => client.Id));
    }

    [Fact]
    public async Task List_SearchesTheNameAnywhereIgnoringCase()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        await SaveAll(
            databaseName,
            tenantId,
            NewClient("Maria SILVA Souza"),
            NewClient("Silvana Reis"),
            NewClient("Ana Lima"));

        var page = await List(databaseName, tenantId, search: "silva");

        Names(page).Should().Equal("Maria SILVA Souza", "Silvana Reis");
        page.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task List_SearchesTheEmailAnywhereAndStillFindsClientsWithoutEmailOrCpfByName()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        await SaveAll(
            databaseName,
            tenantId,
            NewClient("Ana Lima", email: "Ana.Lima@Example.com"),
            NewClient("Bruno Dias", MariaCpf, "bruno@gmail.com"),
            NewClient("Carla Souza"));

        var byEmail = await List(databaseName, tenantId, search: "example");
        var byProviderOnly = await List(databaseName, tenantId, search: "@gmail");
        var byNameOfAClientWithoutEmail = await List(databaseName, tenantId, search: "carla");

        Names(byEmail).Should().Equal("Ana Lima");
        Names(byProviderOnly).Should().Equal("Bruno Dias");
        Names(byNameOfAClientWithoutEmail).Should().Equal("Carla Souza");
    }

    [Fact]
    public async Task List_SearchesTheCpfDigitsAnywhere_WithOrWithoutTheMask()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        await SaveAll(
            databaseName,
            tenantId,
            NewClient("Maria Souza", MariaCpf),
            NewClient("José Pereira", JoseCpf),
            NewClient("Paulo Reis", PauloCpf),
            NewClient("Ana Lima"));

        var whole = await List(databaseName, tenantId, search: "529.982.247-25");
        var partial = await List(databaseName, tenantId, search: "982");

        Names(whole).Should().Equal("Maria Souza");
        Names(partial).Should().Equal("Maria Souza");
    }

    [Fact]
    public async Task List_CombinesTheSearchWithTheSituationAndThePage()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var clients = new[]
        {
            NewClient("Ana Silva"),
            NewClient("Bia Silva"),
            NewClient("Caio Silva"),
            NewClient("Dani Silva"),
            NewClient("Edu Souza"),
        };
        await SaveAll(databaseName, tenantId, clients);
        await SetStatus(databaseName, tenantId, clients[1].Id, ClientStatus.Inactive);
        await SetStatus(databaseName, tenantId, clients[4].Id, ClientStatus.Inactive);

        var activeSilvaFirstPage = await List(databaseName, tenantId, page: 1, pageSize: 2, search: "silva", status: ClientStatus.Active);
        var activeSilvaSecondPage = await List(databaseName, tenantId, page: 2, pageSize: 2, search: "silva", status: ClientStatus.Active);
        var inactiveSilva = await List(databaseName, tenantId, search: "silva", status: ClientStatus.Inactive);
        var anySilva = await List(databaseName, tenantId, search: "silva", status: null);

        Names(activeSilvaFirstPage).Should().Equal("Ana Silva", "Caio Silva");
        Names(activeSilvaSecondPage).Should().Equal("Dani Silva");
        activeSilvaSecondPage.TotalCount.Should().Be(3);
        Names(inactiveSilva).Should().Equal("Bia Silva");
        anySilva.TotalCount.Should().Be(4);
    }

    [Fact]
    public async Task List_ReturnsTheRootWithoutLoadingItsContacts()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var data = new ClientData(
            FullName.Create("Ana Lima").Value,
            null,
            null,
            null,
            null,
            null,
            [new GuardianData("Bia Lima", "Mãe", null, null)],
            []);
        await SaveAll(databaseName, tenantId, Client.Create(data, Today).Value);

        var page = await List(databaseName, tenantId);

        page.Items.Should().ContainSingle().Which.Guardians.Should().BeEmpty();
    }

    [Fact]
    public void Model_SearchesAndSortsGeneratedLowercaseColumns()
    {
        using var context = PersistenceContext.Create(Guid.NewGuid().ToString(), Guid.NewGuid());
        var clients = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Client))!;

        var expressions = new Dictionary<string, string>
        {
            ["NameNormalized"] = "lower(\"FullName\")",
            ["EmailNormalized"] = "lower(\"Email\")",
            ["CpfNormalized"] = "\"Cpf\"",
        };
        foreach (var (name, sql) in expressions)
        {
            var property = clients.FindProperty(name)!;
            property.IsShadowProperty().Should().BeTrue(name);
            property.ClrType.Should().Be(typeof(string), name);
            property.GetComputedColumnSql().Should().Be(sql, name);
            property.GetIsStored().Should().BeTrue(name);
            property.IsNullable.Should().BeTrue(name);
        }
    }
}
