using Admin.SharedKernel;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Services;
using ServicesService.Application.Services.ListServices;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Repositories;

namespace ServicesService.PersistenceTests;

public class ServiceListPersistenceTests
{
    private static int _code;

    private static Service NewService(string name, Guid? categoryId = null)
    {
        return Service.Create(
            Guid.NewGuid(),
            name,
            null,
            DurationRange.Create(15, 30, 60).Value,
            45.50m,
            10m,
            categoryId,
            Interlocked.Increment(ref _code)).Value;
    }

    private static Tag NewTag(string name)
    {
        return Tag.Create(Guid.NewGuid(), name, TagColor.Create("#0d9488").Value, null).Value;
    }

    private static void Add(ServicesDataContext context, Service service)
    {
        new ServiceRepository(context).Add(service);
        context.Entry(service).Property<string>("NameNormalized").CurrentValue = service.Name.ToLowerInvariant();
    }

    private static async Task Save(string databaseName, Guid tenantId, params Service[] services)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        foreach (var service in services)
        {
            Add(context, service);
        }

        await context.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private static async Task SaveTagged(
        string databaseName,
        Guid tenantId,
        IReadOnlyCollection<Tag> tags,
        params (Service Service, Tag[] Tags)[] entries)
    {
        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            var tagRepository = new TagRepository(context);
            foreach (var tag in tags)
            {
                tagRepository.Add(tag);
            }

            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        foreach (var (service, serviceTags) in entries)
        {
            await using var context = PersistenceContext.Create(databaseName, tenantId);
            var ids = serviceTags.Select(tag => tag.Id).ToList();
            service.SetTags(await new TagRepository(context).GetByIdsAsync(ids, CancellationToken.None));
            Add(context, service);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }
    }

    private static async Task SoftDelete(string databaseName, Guid tenantId, Guid serviceId)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var tracked = await context.Services.AsTracking().SingleAsync(s => s.Id == serviceId);
        context.Services.Remove(tracked);
        await context.SaveChangesAsync();
    }

    private static async Task<PagedResult<Service>> List(
        string databaseName,
        Guid tenantId,
        int page = 1,
        int pageSize = 20,
        Guid? categoryId = null,
        Guid? tagId = null,
        string? search = null)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var query = new ListServicesQuery(search is null ? null : SearchText.Create(search).Value, categoryId, tagId)
        {
            Page = page,
            PageSize = pageSize,
        };
        return await new ServiceRepository(context).ListAsync(query.ToFilter(), CancellationToken.None);
    }

    private static string[] Names(PagedResult<Service> page)
    {
        return page.Items.Select(service => service.Name).ToArray();
    }

    [Fact]
    public async Task List_NeverReturnsNorCountsAnotherTenantsServices()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        await Save(databaseName, tenantA, NewService("Corte"), NewService("Barba"));
        await Save(databaseName, tenantB, NewService("Massagem"));

        var asA = await List(databaseName, tenantA);
        var asB = await List(databaseName, tenantB);

        Names(asA).Should().Equal("Barba", "Corte");
        asA.TotalCount.Should().Be(2);
        Names(asB).Should().Equal("Massagem");
        asB.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task List_NeverReturnsNorCountsASoftDeletedService()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var kept = NewService("Corte");
        var deleted = NewService("Barba");
        await Save(databaseName, tenantId, kept, deleted);
        await SoftDelete(databaseName, tenantId, deleted.Id);

        var page = await List(databaseName, tenantId);

        Names(page).Should().Equal("Corte");
        page.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task List_OrdersByNameAndBreaksATieById()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var twins = Enumerable.Range(0, 4).Select(_ => NewService("Corte")).ToArray();
        await Save(databaseName, tenantId, [.. twins, NewService("Barba"), NewService("Unha")]);

        var page = await List(databaseName, tenantId);

        Names(page).Should().Equal("Barba", "Corte", "Corte", "Corte", "Corte", "Unha");
        page.Items.Where(service => service.Name == "Corte").Select(service => service.Id)
            .Should().Equal(twins.Select(service => service.Id).Order());
    }

    [Fact]
    public async Task List_PagesWithoutRepeatingOrOmittingARecordAndEchoesThePage()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var services = Enumerable.Range(0, 7).Select(index => NewService($"Servico {index}")).ToArray();
        await Save(databaseName, tenantId, services);

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
        var seen = first.Items.Concat(second.Items).Concat(third.Items).Select(service => service.Id).ToArray();
        seen.Should().OnlyHaveUniqueItems();
        seen.Should().BeEquivalentTo(services.Select(service => service.Id));
    }

    [Fact]
    public async Task List_FiltersByCategory()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var hair = Guid.NewGuid();
        var nails = Guid.NewGuid();
        await Save(
            databaseName,
            tenantId,
            NewService("Corte", hair),
            NewService("Barba", hair),
            NewService("Unha", nails),
            NewService("Massagem"));

        var page = await List(databaseName, tenantId, categoryId: hair);

        Names(page).Should().Equal("Barba", "Corte");
        page.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task List_SearchesTheNameAnywhereIgnoringCase()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        await Save(databaseName, tenantId, NewService("Corte Masculino"), NewService("Barba e CORTE"), NewService("Manicure"));

        var page = await List(databaseName, tenantId, search: "  Corte ");

        Names(page).Should().Equal("Barba e CORTE", "Corte Masculino");
        page.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task List_FiltersByTagAndLoadsTheTagsOfEachService()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var vip = NewTag("VIP");
        var promo = NewTag("Promo");
        await SaveTagged(
            databaseName,
            tenantId,
            [vip, promo],
            (NewService("Corte"), [vip, promo]),
            (NewService("Barba"), [promo]),
            (NewService("Unha"), []));

        var byVip = await List(databaseName, tenantId, tagId: vip.Id);
        var byPromo = await List(databaseName, tenantId, tagId: promo.Id);

        Names(byVip).Should().Equal("Corte");
        byVip.Items.Single().Tags.Select(tag => tag.Name).Order().Should().Equal("Promo", "VIP");
        Names(byPromo).Should().Equal("Barba", "Corte");
        byPromo.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task List_CombinesCategoryTagAndPaging()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var hair = Guid.NewGuid();
        var vip = NewTag("VIP");
        await SaveTagged(
            databaseName,
            tenantId,
            [vip],
            (NewService("A", hair), [vip]),
            (NewService("B", hair), [vip]),
            (NewService("C", hair), [vip]),
            (NewService("D"), [vip]));

        var first = await List(databaseName, tenantId, page: 1, pageSize: 2, categoryId: hair, tagId: vip.Id);
        var second = await List(databaseName, tenantId, page: 2, pageSize: 2, categoryId: hair, tagId: vip.Id);

        Names(first).Should().Equal("A", "B");
        Names(second).Should().Equal("C");
        second.TotalCount.Should().Be(3);
    }

    [Fact]
    public async Task List_WithNoTenantInContext_ReturnsNothing()
    {
        var databaseName = Guid.NewGuid().ToString();
        await Save(databaseName, Guid.NewGuid(), NewService("Corte"));
        var tenantProvider = Substitute.For<ServicesService.Application.Abstractions.ICurrentTenantProvider>();
        tenantProvider.TryGetTenantId(out Arg.Any<Guid>()).Returns(false);
        var options = new DbContextOptionsBuilder<ServicesDataContext>().UseInMemoryDatabase(databaseName).Options;
        await using var tenantlessContext = new ServicesDataContext(options, tenantProvider);

        var page = await new ServiceRepository(tenantlessContext)
            .ListAsync(new ServiceListFilter(1, 20, null, null, null), CancellationToken.None);

        page.Items.Should().BeEmpty();
        page.TotalCount.Should().Be(0);
    }
}
