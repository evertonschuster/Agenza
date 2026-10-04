using Admin.Identity.Client;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using ServicesService.Application.Abstractions;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Infrastructure.Persistence;
using ServicesService.Infrastructure.Persistence.Interceptors;
using ServicesService.Infrastructure.Repositories;

namespace ServicesService.PersistenceTests;

public class ServicePersistenceTests
{
    private static ServicesDataContext CreateContext(string databaseName, Guid tenantId)
    {
        var tenantProvider = Substitute.For<ICurrentTenantProvider>();
        tenantProvider.TryGetTenantId(out Arg.Any<Guid>()).Returns(callInfo =>
        {
            callInfo[0] = tenantId;
            return true;
        });
        tenantProvider.TenantId.Returns(tenantId);

        var currentUserAccessor = Substitute.For<ICurrentUserAccessor>();
        currentUserAccessor.UserId.Returns((Guid?)Guid.NewGuid());
        var interceptor = new AuditableEntitySaveChangesInterceptor(currentUserAccessor, tenantProvider, TimeProvider.System);

        var options = new DbContextOptionsBuilder<ServicesDataContext>()
            .UseInMemoryDatabase(databaseName)
            .AddInterceptors(interceptor)
            .Options;

        return new ServicesDataContext(options, tenantProvider);
    }

    private static async Task Save(string databaseName, Guid tenantId, Service service)
    {
        await using var context = CreateContext(databaseName, tenantId);
        context.Services.Add(service);
        await context.SaveChangesAsync();
    }

    private static async Task<List<ServiceTag>> AllLinks(string databaseName, Guid tenantId, Guid serviceId)
    {
        await using var context = CreateContext(databaseName, tenantId);
        return await context.Set<ServiceTag>()
            .IgnoreQueryFilters()
            .Where(link => link.ServiceId == serviceId)
            .ToListAsync();
    }

    [Fact]
    public async Task SaveChanges_WithAServiceAndItsTagLinks_AssignsTheCurrentTenantToEveryRow()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        var service = ServiceFixtures.NewService(tagIds: [tagId]);

        await Save(databaseName, tenantId, service);

        service.TenantId.Should().Be(tenantId);
        service.Tags.Should().ContainSingle().Which.TenantId.Should().Be(tenantId);
        service.Tags.Single().CreatedAt.Should().NotBe(default);

        await using var context = CreateContext(databaseName, tenantId);
        var loaded = await new ServiceRepository(context).GetByIdAsync(service.Id, CancellationToken.None);

        loaded!.Tags.Should().ContainSingle().Which.TagId.Should().Be(tagId);
    }

    [Fact]
    public async Task SaveChanges_RoundTripsEveryFieldOfAFixedPricedService()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var categoryId = Guid.NewGuid();
        var service = Service.Create(
            Guid.NewGuid(),
            "Limpeza de pele",
            categoryId,
            "Só para a equipe",
            "Para o cliente",
            ServiceDuration.Create(50, 10, 5, 30, 90).Value,
            PricingType.Fixed,
            Money.Create(120.5m).Value,
            Percentage.Create(7.5m).Value,
            [],
            3).Value;
        await Save(databaseName, tenantId, service);

        await using var context = CreateContext(databaseName, tenantId);
        var loaded = await new ServiceRepository(context).GetByIdAsync(service.Id, CancellationToken.None);

        loaded!.Code.Should().Be(3);
        loaded.Name.Should().Be("Limpeza de pele");
        loaded.CategoryId.Should().Be(categoryId);
        loaded.InternalDescription.Should().Be("Só para a equipe");
        loaded.ClientDescription.Should().Be("Para o cliente");
        loaded.DurationMinutes.Should().Be(50);
        loaded.PreparationMinutes.Should().Be(10);
        loaded.CleanupMinutes.Should().Be(5);
        loaded.TotalDurationMinutes.Should().Be(65);
        loaded.MinDurationMinutes.Should().Be(30);
        loaded.MaxDurationMinutes.Should().Be(90);
        loaded.PricingType.Should().Be(PricingType.Fixed);
        loaded.Price!.Value.Should().Be(120.5m);
        loaded.MaxDiscountPercentage!.Value.Should().Be(7.5m);
        loaded.Status.Should().Be(ServiceStatus.Active);
    }

    [Fact]
    public async Task SaveChanges_RoundTripsAnInactiveVariablePricedServiceWithoutPriceLimitsOrDiscount()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var service = Service.Create(
            Guid.NewGuid(), "Sessão", null, null, null,
            ServiceDuration.Create(50, 0, 0, null, null).Value, PricingType.Variable, null, null, [], 1).Value;
        service.Inactivate();
        await Save(databaseName, tenantId, service);

        await using var context = CreateContext(databaseName, tenantId);
        var loaded = await new ServiceRepository(context).GetByIdAsync(service.Id, CancellationToken.None);

        loaded!.PricingType.Should().Be(PricingType.Variable);
        loaded.Price.Should().BeNull();
        loaded.MaxDiscountPercentage.Should().BeNull();
        loaded.MinDurationMinutes.Should().BeNull();
        loaded.MaxDurationMinutes.Should().BeNull();
        loaded.Status.Should().Be(ServiceStatus.Inactive);
    }

    [Fact]
    public async Task InactivatingAService_PersistsTheNewSituationWithoutTouchingTheRest()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        var service = ServiceFixtures.NewService(tagIds: [tagId]);
        await Save(databaseName, tenantId, service);

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var tracked = await new ServiceRepository(context).GetByIdAsync(service.Id, CancellationToken.None);
            tracked!.Inactivate().IsSuccess.Should().BeTrue();
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var loaded = await new ServiceRepository(context).GetByIdAsync(service.Id, CancellationToken.None);

            loaded!.Status.Should().Be(ServiceStatus.Inactive);
            loaded.UpdatedAt.Should().NotBeNull();
            loaded.Tags.Should().ContainSingle().Which.TagId.Should().Be(tagId);
        }
    }

    [Fact]
    public async Task Services_AreInvisibleToAnotherTenantTogetherWithTheirTagLinks()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var service = ServiceFixtures.NewService(tagIds: [Guid.NewGuid()]);
        await Save(databaseName, tenantA, service);

        await using (var context = CreateContext(databaseName, tenantB))
        {
            (await context.Services.AnyAsync(TestContext.Current.CancellationToken)).Should().BeFalse();
            (await context.Set<ServiceTag>().AnyAsync(TestContext.Current.CancellationToken)).Should().BeFalse();
            (await new ServiceRepository(context).GetByIdAsync(service.Id, CancellationToken.None)).Should().BeNull();
        }

        await using (var context = CreateContext(databaseName, tenantA))
        {
            (await context.Set<ServiceTag>().CountAsync(TestContext.Current.CancellationToken)).Should().Be(1);
        }
    }

    [Fact]
    public async Task RemovingAService_SoftDeletesItsTagLinksToo()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var service = ServiceFixtures.NewService(tagIds: [Guid.NewGuid(), Guid.NewGuid()]);
        await Save(databaseName, tenantId, service);

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var repository = new ServiceRepository(context);
            var tracked = await repository.GetByIdAsync(service.Id, CancellationToken.None);
            repository.Remove(tracked!);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, tenantId))
        {
            (await context.Services.AnyAsync(TestContext.Current.CancellationToken)).Should().BeFalse();
            (await context.Set<ServiceTag>().AnyAsync(TestContext.Current.CancellationToken)).Should().BeFalse();
        }

        var links = await AllLinks(databaseName, tenantId, service.Id);
        links.Should().HaveCount(2).And.OnlyContain(link => link.IsDeleted);
    }

    [Fact]
    public async Task ReplacingTheTags_SoftDeletesTheDroppedLinkAndKeepsTheOthers()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var droppedTagId = Guid.NewGuid();
        var keptTagId = Guid.NewGuid();
        var newTagId = Guid.NewGuid();
        var service = ServiceFixtures.NewService(tagIds: [droppedTagId, keptTagId]);
        await Save(databaseName, tenantId, service);
        var keptLinkId = service.Tags.Single(link => link.TagId == keptTagId).Id;

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var tracked = await new ServiceRepository(context).GetByIdAsync(service.Id, CancellationToken.None);
            ServiceFixtures.ReplaceTags(tracked!, keptTagId, newTagId);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var loaded = await new ServiceRepository(context).GetByIdAsync(service.Id, CancellationToken.None);

            loaded!.Tags.Select(link => link.TagId).Should().BeEquivalentTo([keptTagId, newTagId]);
            loaded.Tags.Single(link => link.TagId == keptTagId).Id.Should().Be(keptLinkId);
        }

        var links = await AllLinks(databaseName, tenantId, service.Id);
        links.Should().HaveCount(3);
        links.Single(link => link.TagId == droppedTagId).IsDeleted.Should().BeTrue();
    }

    [Fact]
    public async Task AddingBackADroppedTag_CreatesANewLinkInsteadOfRevivingTheOldOne()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        var service = ServiceFixtures.NewService(tagIds: [tagId]);
        await Save(databaseName, tenantId, service);

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var tracked = await new ServiceRepository(context).GetByIdAsync(service.Id, CancellationToken.None);
            ServiceFixtures.ReplaceTags(tracked!);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, tenantId))
        {
            var tracked = await new ServiceRepository(context).GetByIdAsync(service.Id, CancellationToken.None);
            tracked!.Tags.Should().BeEmpty();
            ServiceFixtures.ReplaceTags(tracked, tagId);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var links = await AllLinks(databaseName, tenantId, service.Id);
        links.Should().HaveCount(2);
        links.Count(link => !link.IsDeleted).Should().Be(1);
        links.Single(link => !link.IsDeleted).Id.Should().NotBe(links.Single(link => link.IsDeleted).Id);
    }

    [Fact]
    public async Task CountByTagId_CountsOnlyTheLiveServicesOfTheTenantThatStillCarryTheTag()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        var otherTagId = Guid.NewGuid();
        await Save(databaseName, tenantA, ServiceFixtures.NewService("Haircut", tagIds: [tagId]));
        await Save(databaseName, tenantA, ServiceFixtures.NewService("Massage", tagIds: [otherTagId]));
        var droppedLink = ServiceFixtures.NewService("Manicure", tagIds: [tagId]);
        await Save(databaseName, tenantA, droppedLink);
        var deleted = ServiceFixtures.NewService("Pedicure", tagIds: [tagId]);
        await Save(databaseName, tenantA, deleted);
        await Save(databaseName, tenantB, ServiceFixtures.NewService("Waxing", tagIds: [tagId]));

        await using (var context = CreateContext(databaseName, tenantA))
        {
            var repository = new ServiceRepository(context);
            var tracked = await repository.GetByIdAsync(droppedLink.Id, CancellationToken.None);
            ServiceFixtures.ReplaceTags(tracked!, otherTagId);
            repository.Remove((await repository.GetByIdAsync(deleted.Id, CancellationToken.None))!);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, tenantA))
        {
            var repository = new ServiceRepository(context);

            (await repository.CountByTagIdAsync(tagId, CancellationToken.None)).Should().Be(1);
            (await repository.CountByTagIdAsync(otherTagId, CancellationToken.None)).Should().Be(2);
            (await repository.CountByTagIdAsync(Guid.NewGuid(), CancellationToken.None)).Should().Be(0);
        }

        await using (var context = CreateContext(databaseName, tenantB))
        {
            (await new ServiceRepository(context).CountByTagIdAsync(tagId, CancellationToken.None)).Should().Be(1);
        }
    }

    [Fact]
    public async Task CountByTagId_AlsoCountsTheInactiveServices()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantId = Guid.NewGuid();
        var tagId = Guid.NewGuid();
        var inactive = ServiceFixtures.NewService("Haircut", tagIds: [tagId]);
        inactive.Inactivate();
        await Save(databaseName, tenantId, inactive);

        await using var context = CreateContext(databaseName, tenantId);

        (await new ServiceRepository(context).CountByTagIdAsync(tagId, CancellationToken.None)).Should().Be(1);
    }

    [Fact]
    public async Task CountByCategoryId_CountsOnlyTheLiveServicesOfTheTenantInTheCategory()
    {
        var databaseName = Guid.NewGuid().ToString();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();
        var categoryId = Guid.NewGuid();
        await Save(databaseName, tenantA, ServiceFixtures.NewService("Haircut", categoryId));
        await Save(databaseName, tenantA, ServiceFixtures.NewService("Massage"));
        var deleted = ServiceFixtures.NewService("Pedicure", categoryId);
        await Save(databaseName, tenantA, deleted);
        await Save(databaseName, tenantB, ServiceFixtures.NewService("Waxing", categoryId));

        await using (var context = CreateContext(databaseName, tenantA))
        {
            var repository = new ServiceRepository(context);
            repository.Remove((await repository.GetByIdAsync(deleted.Id, CancellationToken.None))!);
            await context.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        await using (var context = CreateContext(databaseName, tenantA))
        {
            (await new ServiceRepository(context).CountByCategoryIdAsync(categoryId, CancellationToken.None)).Should().Be(1);
        }
    }

    [Fact]
    public void Model_BacksTheNameAndCodeUniquenessWithFilteredUniqueIndexes()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var services = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Service))!;

        var nameIndex = services.GetIndexes().Single(index => index.GetDatabaseName() == "IX_Services_TenantId_NameNormalized");
        nameIndex.IsUnique.Should().BeTrue();
        nameIndex.Properties.Select(property => property.Name).Should().Equal("TenantId", "NameNormalized");
        nameIndex.GetFilter().Should().Be("\"DeletedAt\" IS NULL");

        var codeIndex = services.GetIndexes().Single(index => index.GetDatabaseName() == "IX_Services_TenantId_Code");
        codeIndex.IsUnique.Should().BeTrue();
        codeIndex.Properties.Select(property => property.Name).Should().Equal("TenantId", "Code");
        codeIndex.GetFilter().Should().Be("\"DeletedAt\" IS NULL");
    }

    [Fact]
    public void Model_StoresThePricingTypeAndTheStatusAsTextWithACheckOfEveryValue()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var services = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Service))!;

        services.FindProperty(nameof(Service.PricingType))!.GetProviderClrType().Should().Be(typeof(string));
        services.FindProperty(nameof(Service.Status))!.GetProviderClrType().Should().Be(typeof(string));
        services.GetCheckConstraints().Single(check => check.Name == "CK_Services_PricingType").Sql
            .Should().Be("\"PricingType\" IN ('Fixed', 'Variable')");
        services.GetCheckConstraints().Single(check => check.Name == "CK_Services_Status").Sql
            .Should().Be("\"Status\" IN ('Active', 'Inactive')");
    }

    [Fact]
    public void Model_LeavesThePriceTheDurationLimitsAndTheMaxDiscountOptional()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var services = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Service))!;

        services.FindProperty(nameof(Service.Price))!.IsNullable.Should().BeTrue();
        services.FindProperty(nameof(Service.MaxDiscountPercentage))!.IsNullable.Should().BeTrue();
        services.FindProperty(nameof(Service.MinDurationMinutes))!.IsNullable.Should().BeTrue();
        services.FindProperty(nameof(Service.MaxDurationMinutes))!.IsNullable.Should().BeTrue();
        services.FindProperty(nameof(Service.ClientDescription))!.IsNullable.Should().BeTrue();
        services.FindProperty(nameof(Service.InternalDescription))!.IsNullable.Should().BeTrue();
        services.FindProperty(nameof(Service.PreparationMinutes))!.IsNullable.Should().BeFalse();
        services.FindProperty(nameof(Service.CleanupMinutes))!.IsNullable.Should().BeFalse();
    }

    [Fact]
    public void Model_StoresPriceAndMaxDiscountWithTheirPrecision()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var services = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Service))!;

        var price = services.FindProperty(nameof(Service.Price))!;
        price.GetPrecision().Should().Be(10);
        price.GetScale().Should().Be(2);

        var discount = services.FindProperty(nameof(Service.MaxDiscountPercentage))!;
        discount.GetPrecision().Should().Be(5);
        discount.GetScale().Should().Be(2);
    }

    [Fact]
    public void Model_BoundsTheTwoDescriptionsAndKeepsTheirColumnsApart()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var services = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Service))!;

        services.FindProperty(nameof(Service.InternalDescription))!.GetMaxLength().Should().Be(Service.InternalDescriptionMaxLength);
        services.FindProperty(nameof(Service.ClientDescription))!.GetMaxLength().Should().Be(Service.ClientDescriptionMaxLength);
        services.FindProperty(nameof(Service.InternalDescription))!.GetColumnName().Should().Be("InternalDescription");
        services.FindProperty(nameof(Service.ClientDescription))!.GetColumnName().Should().Be("ClientDescription");
    }

    [Fact]
    public void Model_DoesNotStoreTheDerivedTotalDuration()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var services = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(Service))!;

        services.FindProperty(nameof(Service.TotalDurationMinutes)).Should().BeNull();
    }

    [Fact]
    public void Model_BacksTheTagLinkOfAServiceWithAFilteredUniqueIndex()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var links = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(ServiceTag))!;

        var index = links.GetIndexes().Single(index => index.GetDatabaseName() == "IX_ServiceTags_TenantId_ServiceId_TagId");

        index.IsUnique.Should().BeTrue();
        index.Properties.Select(property => property.Name).Should().Equal("TenantId", "ServiceId", "TagId");
        index.GetFilter().Should().Be("\"DeletedAt\" IS NULL");
    }

    [Fact]
    public void Model_ConnectsTheTagLinkToItsServiceAndToItsTagThroughTheTenantScopedKeys()
    {
        using var context = CreateContext(Guid.NewGuid().ToString(), Guid.NewGuid());
        var links = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(ServiceTag))!;

        var toService = links.GetForeignKeys().Single(foreignKey => foreignKey.PrincipalEntityType.ClrType == typeof(Service));
        toService.Properties.Select(property => property.Name).Should().Equal("TenantId", "ServiceId");
        toService.PrincipalKey.Properties.Select(property => property.Name).Should().Equal("TenantId", "Id");
        toService.DeleteBehavior.Should().Be(DeleteBehavior.Cascade);

        var toTag = links.GetForeignKeys().Single(foreignKey => foreignKey.PrincipalEntityType.ClrType == typeof(Tag));
        toTag.Properties.Select(property => property.Name).Should().Equal("TenantId", "TagId");
        toTag.PrincipalKey.Properties.Select(property => property.Name).Should().Equal("TenantId", "Id");
        toTag.DeleteBehavior.Should().Be(DeleteBehavior.Restrict);
    }
}
