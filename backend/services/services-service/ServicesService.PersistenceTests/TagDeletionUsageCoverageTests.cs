using Admin.SharedKernel;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.Logging.Abstractions;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.DeleteTag;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Repositories;

namespace ServicesService.PersistenceTests;

// Covers direct EF foreign keys to Tag only: references in JSON or in other services need their own
// guard, and EF InMemory proves neither PostgreSQL constraints nor safety under concurrency.
public class TagDeletionUsageCoverageTests
{
    private static readonly DateOnly Today = new(2026, 11, 14);

    private static readonly IReadOnlyDictionary<string, Func<ServicesDataContext, Tag, Task>> UsageScenarios =
        new Dictionary<string, Func<ServicesDataContext, Tag, Task>>
        {
            [$"{typeof(ClientTag).FullName}(TenantId,TagId)"] = AddClientUsage,
            ["ServiceTags(TenantId,TagsId)"] = AddServiceUsage,
        };

    private static string RelationKey(IReadOnlyForeignKey key) =>
        $"{key.DeclaringEntityType.Name}({string.Join(",", key.Properties.Select(property => property.Name))})";

    private static HashSet<string> TagRelations(ServicesDataContext context) =>
        context.Model.GetEntityTypes()
            .SelectMany(entity => entity.GetForeignKeys())
            .Where(key => key.PrincipalEntityType.ClrType == typeof(Tag))
            .Select(RelationKey)
            .ToHashSet(StringComparer.Ordinal);

    private static async Task AddClientUsage(ServicesDataContext context, Tag tag)
    {
        var data = new ClientData(FullName.Create("Ana Lima").Value, null, null, null, null, null, [], [], [tag.Id]);
        var client = Client.Create(data, Today).Value;
        new ClientRepository(context).Add(client);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private static async Task AddServiceUsage(ServicesDataContext context, Tag tag)
    {
        var service = Service.Create(Guid.NewGuid(), "Corte", null, DurationRange.Create(15, 30, 60).Value, 45m, 10m, null, 1, ServiceModality.InPersonOnly).Value;
        service.SetTags([tag]);
        new ServiceRepository(context).Add(service);
        await context.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    [Fact]
    public void EveryModelRelationToTagHasAnExecutableDeletionScenario()
    {
        using var context = PersistenceContext.Create(Guid.NewGuid().ToString(), Guid.NewGuid());
        TagRelations(context).Should().BeEquivalentTo(UsageScenarios.Keys,
            "each relationship to Tag needs a scenario that exercises deletion");
    }

    [Fact]
    public void OmittingARealRelationIsDetected()
    {
        using var context = PersistenceContext.Create(Guid.NewGuid().ToString(), Guid.NewGuid());
        var incomplete = UsageScenarios.Keys.Where(key => key != "ServiceTags(TenantId,TagsId)");
        TagRelations(context).Except(incomplete).Should().ContainSingle().Which.Should().Be("ServiceTags(TenantId,TagsId)");
    }

    [Fact]
    public async Task EachCoveredRelationBlocksDeletionForItsOwnTenant()
    {
        foreach (var (relation, addUsage) in UsageScenarios)
        {
            var databaseName = Guid.NewGuid().ToString();
            var tenantId = Guid.NewGuid();
            var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
            await using (var seed = PersistenceContext.Create(databaseName, tenantId))
            {
                new TagRepository(seed).Add(tag);
                await seed.SaveChangesAsync(TestContext.Current.CancellationToken);
                await addUsage(seed, tag);
                var seededRelation = seed.ChangeTracker.Entries().Any(entry =>
                    entry.Metadata.GetForeignKeys().Any(key =>
                        key.PrincipalEntityType.ClrType == typeof(Tag) && RelationKey(key) == relation &&
                        key.Properties.Select((property, index) => (property, principal: key.PrincipalKey.Properties[index]))
                            .Any(pair => pair.principal.Name == nameof(Tag.Id) &&
                                Equals(entry.Property(pair.property.Name).CurrentValue, tag.Id))));
                seededRelation.Should().BeTrue($"the scenario for {relation} must create that relationship to the tag");
            }

            await using var context = PersistenceContext.Create(databaseName, tenantId);
            var unitOfWork = Substitute.For<IUnitOfWork>();
            var handler = new DeleteTagCommandHandler(
                new TagRepository(context), new ServiceRepository(context), new ClientRepository(context),
                unitOfWork, NullLogger<DeleteTagCommandHandler>.Instance);

            var result = await handler.Handle(new DeleteTagCommand(tag.Id), TestContext.Current.CancellationToken);

            result.IsFailure.Should().BeTrue(relation);
            result.Error.Code.Should().Be("Tag.InUse", relation);
            result.Error.Type.Should().Be(ErrorType.Conflict, relation);
            await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
            (await new TagRepository(context).GetByIdAsync(tag.Id, TestContext.Current.CancellationToken)).Should().NotBeNull(relation);

            await using var otherTenant = PersistenceContext.Create(databaseName, Guid.NewGuid());
            var otherHandler = new DeleteTagCommandHandler(
                new TagRepository(otherTenant), new ServiceRepository(otherTenant), new ClientRepository(otherTenant),
                Substitute.For<IUnitOfWork>(), NullLogger<DeleteTagCommandHandler>.Instance);
            var foreignResult = await otherHandler.Handle(new DeleteTagCommand(tag.Id), TestContext.Current.CancellationToken);
            foreignResult.Error.Code.Should().Be("Tag.NotFound", relation);
        }
    }
}
