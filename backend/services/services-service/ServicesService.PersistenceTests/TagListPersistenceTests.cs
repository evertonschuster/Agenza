using Admin.SharedKernel;
using Microsoft.EntityFrameworkCore;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.ListTags;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Repositories;

namespace ServicesService.PersistenceTests;

public class TagListPersistenceTests
{
    private static Tag NewTag(string name)
    {
        return Tag.Create(Guid.NewGuid(), name, TagColor.Create("#0d9488").Value, null).Value;
    }

    private static async Task SaveAll(string databaseName, Guid tenantId, params Tag[] tags)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        foreach (var tag in tags)
        {
            context.Tags.Add(tag);
            context.Entry(tag).Property<string>("NameNormalized").CurrentValue = tag.Name.ToLowerInvariant();
        }

        await context.SaveChangesAsync();
    }

    private static async Task<PagedResult<Tag>> List(
        string databaseName, Guid tenantId, int page = 1, int pageSize = 20, string? search = null)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var query = new ListTagsQuery(search is null ? null : SearchText.Create(search).Value)
        {
            Page = page,
            PageSize = pageSize,
        };
        var result = await new TagRepository(context).ListAsync(query.ToFilter(), CancellationToken.None);
        context.ChangeTracker.Entries().Should().BeEmpty();
        return result;
    }

    [Fact]
    public async Task List_WithoutPagingParameters_LimitsTheFirstPageToTwentyItems()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        await SaveAll(databaseName, tenantId, Enumerable.Range(1, 25).Select(index => NewTag($"Tag {index:D2}")).ToArray());

        var page = await List(databaseName, tenantId);

        page.Items.Should().HaveCount(20);
        page.Items.Select(tag => tag.Name).Should().Equal(Enumerable.Range(1, 20).Select(index => $"Tag {index:D2}"));
        page.TotalCount.Should().Be(25);
        page.Page.Should().Be(1);
        page.PageSize.Should().Be(20);
    }

    [Fact]
    public async Task List_PagesInNameOrderWithoutRepeatingOrOmittingATag()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var tags = new[] { NewTag("VIP"), NewTag("Promoção"), NewTag("Novidade"), NewTag("Especial"), NewTag("Aniversário") };
        await SaveAll(databaseName, tenantId, tags);

        var first = await List(databaseName, tenantId, page: 1, pageSize: 2);
        var second = await List(databaseName, tenantId, page: 2, pageSize: 2);
        var third = await List(databaseName, tenantId, page: 3, pageSize: 2);
        var past = await List(databaseName, tenantId, page: 4, pageSize: 2);

        first.Items.Should().HaveCount(2);
        second.Items.Should().HaveCount(2);
        third.Items.Should().HaveCount(1);
        past.Items.Should().BeEmpty();
        new[] { first, second, third, past }.Select(page => page.TotalCount).Should().OnlyContain(total => total == 5);
        new[] { first, second, third, past }.Select(page => (page.Page, page.PageSize))
            .Should().Equal((1, 2), (2, 2), (3, 2), (4, 2));
        var seen = first.Items.Concat(second.Items).Concat(third.Items).ToArray();
        seen.Select(tag => tag.Id).Should().OnlyHaveUniqueItems().And.BeEquivalentTo(tags.Select(tag => tag.Id));
        seen.Select(tag => tag.Name).Should().Equal(tags.OrderBy(tag => tag.Name).Select(tag => tag.Name));
    }

    [Fact]
    public async Task List_WithEqualNames_BreaksTheTieById()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var tags = Enumerable.Range(0, 3).Select(_ => NewTag("VIP")).ToArray();
        await SaveAll(databaseName, tenantId, tags);

        var first = await List(databaseName, tenantId, page: 1, pageSize: 2);
        var second = await List(databaseName, tenantId, page: 2, pageSize: 2);

        first.Items.Concat(second.Items).Select(tag => tag.Id).Should().Equal(tags.Select(tag => tag.Id).Order());
    }

    [Fact]
    public async Task List_WithSearch_CountsTheFilteredTagsBeforePaging()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        await SaveAll(databaseName, tenantId, NewTag("VIP Bronze"), NewTag("VIP Ouro"), NewTag("VIP Prata"), NewTag("Promoção"));

        var first = await List(databaseName, tenantId, page: 1, pageSize: 2, search: "  vIp  ");
        var second = await List(databaseName, tenantId, page: 2, pageSize: 2, search: "  vIp  ");

        first.TotalCount.Should().Be(3);
        second.TotalCount.Should().Be(3);
        first.Items.Select(tag => tag.Name).Should().Equal("VIP Bronze", "VIP Ouro");
        second.Items.Select(tag => tag.Name).Should().Equal("VIP Prata");
    }

    [Theory]
    [InlineData("%", "50% off")]
    [InlineData("_", "e_f especial", "VIP_gold")]
    [InlineData("e_f", "e_f especial")]
    [InlineData("promo", "Super PROMOÇÃO")]
    public async Task List_SearchesForLiteralTextAnywhereIgnoringCase(string search, params string[] expected)
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        await SaveAll(databaseName, tenantId, NewTag("50% off"), NewTag("VIP_gold"), NewTag("e_f especial"), NewTag("Super PROMOÇÃO"), NewTag("VIP"));

        var page = await List(databaseName, tenantId, search: search);

        page.Items.Select(tag => tag.Name).Should().BeEquivalentTo(expected);
        page.TotalCount.Should().Be(expected.Length);
    }

    [Fact]
    public async Task List_WithNoMatches_ReturnsAnEmptyPageAndZeroTotal()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        await SaveAll(databaseName, tenantId, NewTag("VIP"));

        var page = await List(databaseName, tenantId, search: "ausente");

        page.Items.Should().BeEmpty();
        page.TotalCount.Should().Be(0);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("vip")]
    public async Task List_NeverReturnsNorCountsAnotherTenantsOrDeletedTags(string? search)
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var deleted = NewTag("VIP Excluída");
        await SaveAll(databaseName, tenantA, NewTag("VIP A"), deleted);
        await SaveAll(databaseName, tenantB, NewTag("VIP B"));
        await using (var context = PersistenceContext.Create(databaseName, tenantA))
        {
            var tracked = await context.Tags.AsTracking().SingleAsync(tag => tag.Id == deleted.Id, TestContext.Current.CancellationToken);
            context.Tags.Remove(tracked);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var asA = await List(databaseName, tenantA, search: search);
        var asB = await List(databaseName, tenantB, search: search);

        asA.Items.Should().ContainSingle().Which.Name.Should().Be("VIP A");
        asA.TotalCount.Should().Be(1);
        asB.Items.Should().ContainSingle().Which.Name.Should().Be("VIP B");
        asB.TotalCount.Should().Be(1);
    }

    [Fact]
    public async Task List_WithoutATenant_ReturnsAnEmptyPage()
    {
        var databaseName = Guid.NewGuid().ToString();
        await SaveAll(databaseName, Guid.NewGuid(), NewTag("VIP"));
        var tenantProvider = Substitute.For<ICurrentTenantProvider>();
        tenantProvider.TryGetTenantId(out Arg.Any<Guid>()).Returns(false);
        var options = new DbContextOptionsBuilder<ServicesDataContext>().UseInMemoryDatabase(databaseName).Options;
        await using var context = new ServicesDataContext(options, tenantProvider);

        var page = await new TagRepository(context).ListAsync(new ListTagsQuery().ToFilter(), CancellationToken.None);

        page.Items.Should().BeEmpty();
        page.TotalCount.Should().Be(0);
    }
}
