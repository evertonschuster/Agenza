using Microsoft.EntityFrameworkCore;
using ServicesService.Infrastructure.Repositories;

namespace ServicesService.PersistenceTests;

public class CategoryPersistenceTests
{
    private static async Task<Guid> SaveCategory(string databaseName, Guid tenantId, string name)
    {
        var category = Category.Create(Guid.NewGuid(), name).Value;

        await using var context = PersistenceContext.Create(databaseName, tenantId);
        new CategoryRepository(context).Add(category);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);

        return category.Id;
    }

    [Fact]
    public async Task UpdateAsync_PersistsTheChangesOfACategoryLoadedWithoutTracking()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var id = await SaveCategory(databaseName, tenantId, "Hair");

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            var repository = new CategoryRepository(context);
            var category = (await repository.GetByIdAsync(id, CancellationToken.None))!;
            context.ChangeTracker.Entries().Should().BeEmpty();

            category.Update("Nails").IsSuccess.Should().BeTrue();
            await repository.UpdateAsync(category, CancellationToken.None);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            var reloaded = await new CategoryRepository(context).GetByIdAsync(id, CancellationToken.None);

            reloaded!.Name.Should().Be("Nails");
            reloaded.TenantId.Should().Be(tenantId);
        }
    }

    [Fact]
    public async Task WithoutUpdateAsync_AChangeToACategoryLoadedWithoutTrackingIsNotPersisted()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var id = await SaveCategory(databaseName, tenantId, "Hair");

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            var category = (await new CategoryRepository(context).GetByIdAsync(id, CancellationToken.None))!;

            category.Update("Nails");
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            (await new CategoryRepository(context).GetByIdAsync(id, CancellationToken.None))!.Name.Should().Be("Hair");
        }
    }

    [Fact]
    public async Task Remove_SoftDeletesACategoryLoadedWithoutTracking()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var id = await SaveCategory(databaseName, tenantId, "Hair");

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            var repository = new CategoryRepository(context);
            var category = (await repository.GetByIdAsync(id, CancellationToken.None))!;

            repository.Remove(category);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = PersistenceContext.Create(databaseName, tenantId))
        {
            (await new CategoryRepository(context).GetByIdAsync(id, CancellationToken.None)).Should().BeNull();
            var row = await context.Categories.IgnoreQueryFilters().SingleAsync(TestContext.Current.CancellationToken);
            row.DeletedAt.Should().NotBeNull();
        }
    }
}
