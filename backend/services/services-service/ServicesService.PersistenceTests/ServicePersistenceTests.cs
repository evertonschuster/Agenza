using Microsoft.EntityFrameworkCore;
using ServicesService.Infrastructure.Repositories;

namespace ServicesService.PersistenceTests;

public class ServicePersistenceTests
{
    private static Tag NewTag(string name) =>
        Tag.Create(Guid.NewGuid(), name, TagColor.Create("#0d9488").Value, null).Value;

    private static Service NewService(string name = "Haircut") =>
        Service.Create(Guid.NewGuid(), name, null, DurationRange.Create(15, 30, 60).Value, 45.50m, 10m, null, 1).Value;

    private static async Task<IReadOnlyList<Guid>> SaveTags(string databaseName, Guid tenantId, params string[] names)
    {
        var tags = names.Select(NewTag).ToList();

        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var repository = new TagRepository(context);
        foreach (var tag in tags)
        {
            repository.Add(tag);
        }

        await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        return tags.Select(tag => tag.Id).ToList();
    }

    private static async Task<Guid> SaveService(string databaseName, Guid tenantId, IReadOnlyCollection<Guid> tagIds)
    {
        var service = NewService();

        await using var context = PersistenceContext.Create(databaseName, tenantId);
        service.SetTags(await new TagRepository(context).GetByIdsAsync(tagIds, CancellationToken.None));
        new ServiceRepository(context).Add(service);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        return service.Id;
    }

    private static async Task<string[]> TagNamesOf(string databaseName, Guid tenantId, Guid serviceId)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);
        var service = await new ServiceRepository(context).GetByIdAsync(serviceId, CancellationToken.None);

        return service!.Tags.Select(tag => tag.Name).Order().ToArray();
    }

    private static async Task<int> LiveTagCount(string databaseName, Guid tenantId)
    {
        await using var context = PersistenceContext.Create(databaseName, tenantId);

        return await context.Tags.CountAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public async Task Add_LinksTheTagsOfANewServiceWithoutInsertingThemAgain()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var tagIds = await SaveTags(databaseName, tenantId, "Vip", "Kids");

        var serviceId = await SaveService(databaseName, tenantId, tagIds);

        (await TagNamesOf(databaseName, tenantId, serviceId)).Should().Equal("Kids", "Vip");
        (await LiveTagCount(databaseName, tenantId)).Should().Be(2);
    }

    [Fact]
    public async Task UpdateAsync_ReplacesTheTagLinksAndLeavesTheTagsThemselvesAlone()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var tagIds = await SaveTags(databaseName, tenantId, "Vip", "Kids", "Night");
        var serviceId = await SaveService(databaseName, tenantId, [tagIds[0], tagIds[1]]);

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            var services = new ServiceRepository(context);
            var service = (await services.GetByIdAsync(serviceId, CancellationToken.None))!;
            context.ChangeTracker.Entries().Should().BeEmpty();

            service.SetTags(await new TagRepository(context).GetByIdsAsync([tagIds[1], tagIds[2]], CancellationToken.None));
            await services.UpdateAsync(service, CancellationToken.None);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        (await TagNamesOf(databaseName, tenantId, serviceId)).Should().Equal("Kids", "Night");
        (await LiveTagCount(databaseName, tenantId)).Should().Be(3);
    }

    [Fact]
    public async Task UpdateAsync_PersistsTheChangedFieldsAndKeepsTheTagsWhenTheyWereNotTouched()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var tagIds = await SaveTags(databaseName, tenantId, "Vip", "Kids");
        var serviceId = await SaveService(databaseName, tenantId, tagIds);

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            var services = new ServiceRepository(context);
            var service = (await services.GetByIdAsync(serviceId, CancellationToken.None))!;

            service.Update("Massage", "Relaxing", DurationRange.Create(30, 60, 90).Value, 90m, 20m, null).IsSuccess.Should().BeTrue();
            await services.UpdateAsync(service, CancellationToken.None);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            var reloaded = (await new ServiceRepository(context).GetByIdAsync(serviceId, CancellationToken.None))!;

            reloaded.Name.Should().Be("Massage");
            reloaded.Description.Should().Be("Relaxing");
            reloaded.DurationMinutes.Should().Be(60);
            reloaded.Price.Should().Be(90m);
            reloaded.MaxDiscountPercentage.Should().Be(20m);
            reloaded.Code.Should().Be(1);
            reloaded.TenantId.Should().Be(tenantId);
        }

        (await TagNamesOf(databaseName, tenantId, serviceId)).Should().Equal("Kids", "Vip");
    }

    [Fact]
    public async Task UpdateAsync_WithNoTagsLeft_RemovesEveryLink()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var tagIds = await SaveTags(databaseName, tenantId, "Vip", "Kids");
        var serviceId = await SaveService(databaseName, tenantId, tagIds);

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            var services = new ServiceRepository(context);
            var service = (await services.GetByIdAsync(serviceId, CancellationToken.None))!;

            service.SetTags([]);
            await services.UpdateAsync(service, CancellationToken.None);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        (await TagNamesOf(databaseName, tenantId, serviceId)).Should().BeEmpty();
        (await LiveTagCount(databaseName, tenantId)).Should().Be(2);
    }

    [Fact]
    public async Task Remove_SoftDeletesAServiceLoadedWithoutTrackingAndLeavesItsTagsAlone()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var tagIds = await SaveTags(databaseName, tenantId, "Vip", "Kids");
        var serviceId = await SaveService(databaseName, tenantId, tagIds);

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            var services = new ServiceRepository(context);
            var service = (await services.GetByIdAsync(serviceId, CancellationToken.None))!;

            services.Remove(service);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            (await new ServiceRepository(context).GetByIdAsync(serviceId, CancellationToken.None)).Should().BeNull();
            (await context.Services.IgnoreQueryFilters().SingleAsync(TestContext.Current.CancellationToken))
                .DeletedAt.Should().NotBeNull();
        }

        (await LiveTagCount(databaseName, tenantId)).Should().Be(2);
    }
}
