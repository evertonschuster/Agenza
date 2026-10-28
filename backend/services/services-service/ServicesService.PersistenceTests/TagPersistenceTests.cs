using ServicesService.Infrastructure.Repositories;

namespace ServicesService.PersistenceTests;

public class TagPersistenceTests
{
    [Fact]
    public async Task GetByIds_WithNoIds_ReturnsAnEmptyListWithoutQuerying()
    {
        var context = PersistenceContext.Create(Guid.NewGuid().ToString(), Guid.NewGuid());
        await context.DisposeAsync();

        var tags = await new TagRepository(context).GetByIdsAsync([], TestContext.Current.CancellationToken);

        tags.Should().BeEmpty();
    }
}
