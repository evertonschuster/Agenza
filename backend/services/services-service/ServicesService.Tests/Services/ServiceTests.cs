using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Services;

public class ServiceTests
{
    private static DomainResult<Service> Create(
        string name = "Haircut",
        string? internalDescription = "Only for the team",
        string? clientDescription = "A classic cut",
        PricingType pricingType = PricingType.Fixed,
        decimal? price = 45.50m,
        Guid? categoryId = null,
        IReadOnlyCollection<Guid>? tagIds = null) =>
        Service.Create(
            Guid.NewGuid(),
            name,
            categoryId,
            internalDescription,
            clientDescription,
            ServiceTestData.Duration(),
            pricingType,
            price is null ? null : ServiceTestData.Price(price.Value),
            ServiceTestData.Discount(),
            tagIds ?? [],
            1);

    private static DomainResult Update(
        Service service,
        string name = "Deep Tissue Massage",
        string? internalDescription = null,
        string? clientDescription = null,
        PricingType pricingType = PricingType.Fixed,
        decimal? price = 90m,
        Guid? categoryId = null,
        IReadOnlyCollection<Guid>? tagIds = null) =>
        service.Update(
            name,
            categoryId,
            internalDescription,
            clientDescription,
            ServiceTestData.Duration(90, 10, 5, 60, 120),
            pricingType,
            price is null ? null : ServiceTestData.Price(price.Value),
            ServiceTestData.Discount(25m),
            tagIds ?? []);

    public static TheoryData<string, string, string?, string?, PricingType, decimal?, Guid[], string> InvalidInput()
    {
        var duplicated = Guid.NewGuid();

        return new TheoryData<string, string, string?, string?, PricingType, decimal?, Guid[], string>
        {
            { "blank name", "   ", null, null, PricingType.Fixed, 10m, [], "Service.NameRequired" },
            { "name over the maximum", new string('x', Service.NameMaxLength + 1), null, null, PricingType.Fixed, 10m, [], "Service.NameTooLong" },
            { "internal description over the maximum", "Haircut", new string('x', Service.InternalDescriptionMaxLength + 1), null, PricingType.Fixed, 10m, [], "Service.InternalDescriptionTooLong" },
            { "client description over the maximum", "Haircut", null, new string('x', Service.ClientDescriptionMaxLength + 1), PricingType.Fixed, 10m, [], "Service.ClientDescriptionTooLong" },
            { "fixed price without a price", "Haircut", null, null, PricingType.Fixed, null, [], "Service.PriceRequired" },
            { "variable price with a price", "Haircut", null, null, PricingType.Variable, 10m, [], "Service.PriceNotAllowed" },
            { "too many tags", "Haircut", null, null, PricingType.Fixed, 10m, Enumerable.Range(0, Service.MaxTags + 1).Select(_ => Guid.NewGuid()).ToArray(), "Service.TooManyTags" },
            { "empty tag id", "Haircut", null, null, PricingType.Fixed, 10m, [Guid.Empty], "Service.InvalidTag" },
            { "repeated tag id", "Haircut", null, null, PricingType.Fixed, 10m, [duplicated, duplicated], "Service.DuplicateTags" },
        };
    }

    [Fact]
    public void Create_WithValidValues_TrimsTextAndKeepsEveryValue()
    {
        var id = Guid.NewGuid();
        var categoryId = Guid.NewGuid();

        var result = Service.Create(
            id,
            "  Haircut  ",
            categoryId,
            "  Only for the team  ",
            "  A classic cut  ",
            ServiceTestData.Duration(30, 10, 5, 15, 60),
            PricingType.Fixed,
            ServiceTestData.Price(),
            ServiceTestData.Discount(),
            [],
            7);

        result.IsSuccess.Should().BeTrue();
        var service = result.Value;
        service.Id.Should().Be(id);
        service.TenantId.Should().Be(Guid.Empty);
        service.Code.Should().Be(7);
        service.Name.Should().Be("Haircut");
        service.InternalDescription.Should().Be("Only for the team");
        service.ClientDescription.Should().Be("A classic cut");
        service.DurationMinutes.Should().Be(30);
        service.PreparationMinutes.Should().Be(10);
        service.CleanupMinutes.Should().Be(5);
        service.MinDurationMinutes.Should().Be(15);
        service.MaxDurationMinutes.Should().Be(60);
        service.PricingType.Should().Be(PricingType.Fixed);
        service.Price.Should().Be(ServiceTestData.Price());
        service.MaxDiscountPercentage.Should().Be(ServiceTestData.Discount());
        service.CategoryId.Should().Be(categoryId);
        service.Status.Should().Be(ServiceStatus.Active);
        service.Tags.Should().BeEmpty();
    }

    [Fact]
    public void TotalDurationMinutes_IsThePreparationPlusTheDurationPlusTheCleanup()
    {
        var service = Service.Create(
            Guid.NewGuid(), "Haircut", null, null, null,
            ServiceTestData.Duration(30, 10, 5), PricingType.Variable, null, null, [], 1).Value;

        service.TotalDurationMinutes.Should().Be(45);
    }

    [Fact]
    public void TotalDurationMinutes_WithoutBuffers_IsTheDuration()
    {
        Create().Value.TotalDurationMinutes.Should().Be(30);
    }

    [Fact]
    public void Create_WithFixedPriceZero_IsAFreeService()
    {
        var result = Create(price: 0m);

        result.IsSuccess.Should().BeTrue();
        result.Value.Price.Should().Be(ServiceTestData.Price(0m));
    }

    [Fact]
    public void Create_WithVariablePriceAndNoPrice_NeedsNoFixedAmount()
    {
        var result = Create(pricingType: PricingType.Variable, price: null);

        result.IsSuccess.Should().BeTrue();
        result.Value.PricingType.Should().Be(PricingType.Variable);
        result.Value.Price.Should().BeNull();
    }

    [Fact]
    public void Create_WithoutMaxDiscount_LeavesItNull()
    {
        var service = Service.Create(
            Guid.NewGuid(), "Haircut", null, null, null,
            ServiceTestData.Duration(), PricingType.Fixed, ServiceTestData.Price(), null, [], 1).Value;

        service.MaxDiscountPercentage.Should().BeNull();
    }

    [Fact]
    public void Create_KeepsTheTwoDescriptionsApart()
    {
        var service = Create(internalDescription: "Internal", clientDescription: "For the client").Value;

        service.InternalDescription.Should().Be("Internal");
        service.ClientDescription.Should().Be("For the client");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankDescriptions_StoresNull(string? description)
    {
        var result = Create(internalDescription: description, clientDescription: description);

        result.IsSuccess.Should().BeTrue();
        result.Value.InternalDescription.Should().BeNull();
        result.Value.ClientDescription.Should().BeNull();
    }

    [Fact]
    public void Create_WithoutCategory_LeavesCategoryIdNull()
    {
        Create().Value.CategoryId.Should().BeNull();
    }

    [Fact]
    public void Create_AcceptsTheLongestTextsAndTheMostTags()
    {
        var tagIds = Enumerable.Range(0, Service.MaxTags).Select(_ => Guid.NewGuid()).ToArray();

        var result = Create(
            name: new string('x', Service.NameMaxLength),
            internalDescription: new string('i', Service.InternalDescriptionMaxLength),
            clientDescription: new string('c', Service.ClientDescriptionMaxLength),
            tagIds: tagIds);

        result.IsSuccess.Should().BeTrue();
        result.Value.Tags.Should().HaveCount(Service.MaxTags);
    }

    [Fact]
    public void Create_LinksEachTagToTheServiceWithAnIdOfItsOwn()
    {
        var firstTagId = Guid.NewGuid();
        var secondTagId = Guid.NewGuid();

        var service = Create(tagIds: [firstTagId, secondTagId]).Value;

        service.Tags.Select(link => link.TagId).Should().BeEquivalentTo([firstTagId, secondTagId]);
        service.Tags.Should().OnlyContain(link => link.ServiceId == service.Id);
        service.Tags.Select(link => link.Id).Should().OnlyHaveUniqueItems().And.NotContain(Guid.Empty);
        service.Tags.Should().OnlyContain(link => link.TenantId == Guid.Empty);
    }

    [Theory]
    [MemberData(nameof(InvalidInput))]
    public void Create_WithInvalidInput_ReturnsTheNamedError(
        string rule,
        string name,
        string? internalDescription,
        string? clientDescription,
        PricingType pricingType,
        decimal? price,
        Guid[] tagIds,
        string expectedCode)
    {
        var result = Create(name, internalDescription, clientDescription, pricingType, price, tagIds: tagIds);

        result.IsFailure.Should().BeTrue(rule);
        result.Error.Code.Should().Be(expectedCode, rule);
    }

    [Fact]
    public void Update_ReplacesEveryFieldExceptTheCodeAndTheStatus()
    {
        var service = Create().Value;
        service.Inactivate();
        var categoryId = Guid.NewGuid();

        var result = Update(service, "  Deep Tissue Massage  ", " Internal ", " For the client ", categoryId: categoryId);

        result.IsSuccess.Should().BeTrue();
        service.Name.Should().Be("Deep Tissue Massage");
        service.InternalDescription.Should().Be("Internal");
        service.ClientDescription.Should().Be("For the client");
        service.DurationMinutes.Should().Be(90);
        service.PreparationMinutes.Should().Be(10);
        service.CleanupMinutes.Should().Be(5);
        service.MinDurationMinutes.Should().Be(60);
        service.MaxDurationMinutes.Should().Be(120);
        service.PricingType.Should().Be(PricingType.Fixed);
        service.Price.Should().Be(ServiceTestData.Price(90m));
        service.MaxDiscountPercentage.Should().Be(ServiceTestData.Discount(25m));
        service.CategoryId.Should().Be(categoryId);
        service.Code.Should().Be(1);
        service.Status.Should().Be(ServiceStatus.Inactive);
    }

    [Fact]
    public void Update_FromAFixedToAVariablePrice_DropsTheAmount()
    {
        var service = Create().Value;

        var result = Update(service, pricingType: PricingType.Variable, price: null);

        result.IsSuccess.Should().BeTrue();
        service.PricingType.Should().Be(PricingType.Variable);
        service.Price.Should().BeNull();
    }

    [Fact]
    public void Update_FromAVariableToAFixedPrice_NeedsTheAmount()
    {
        var service = Create(pricingType: PricingType.Variable, price: null).Value;

        Update(service, pricingType: PricingType.Fixed, price: null).Error.Code.Should().Be("Service.PriceRequired");

        var result = Update(service, pricingType: PricingType.Fixed, price: 0m);

        result.IsSuccess.Should().BeTrue();
        service.Price.Should().Be(ServiceTestData.Price(0m));
    }

    [Fact]
    public void Update_KeepsTheLinksOfTheTagsThatStay()
    {
        var keptTagId = Guid.NewGuid();
        var service = Create(tagIds: [keptTagId, Guid.NewGuid()]).Value;
        var keptLink = service.Tags.Single(link => link.TagId == keptTagId);

        Update(service, tagIds: [keptTagId]);

        service.Tags.Should().ContainSingle().Which.Should().BeSameAs(keptLink);
    }

    [Fact]
    public void Update_DropsTheTagsLeftOutAndLinksTheNewOnes()
    {
        var droppedTagId = Guid.NewGuid();
        var keptTagId = Guid.NewGuid();
        var newTagId = Guid.NewGuid();
        var service = Create(tagIds: [droppedTagId, keptTagId]).Value;

        var result = Update(service, tagIds: [keptTagId, newTagId]);

        result.IsSuccess.Should().BeTrue();
        service.Tags.Select(link => link.TagId).Should().BeEquivalentTo([keptTagId, newTagId]);
        service.Tags.Should().OnlyContain(link => link.ServiceId == service.Id);
    }

    [Fact]
    public void Update_WithNoTags_RemovesEveryLink()
    {
        var service = Create(tagIds: [Guid.NewGuid(), Guid.NewGuid()]).Value;

        Update(service, tagIds: []);

        service.Tags.Should().BeEmpty();
    }

    [Theory]
    [MemberData(nameof(InvalidInput))]
    public void Update_WithInvalidInput_ReturnsTheNamedErrorAndChangesNothing(
        string rule,
        string name,
        string? internalDescription,
        string? clientDescription,
        PricingType pricingType,
        decimal? price,
        Guid[] tagIds,
        string expectedCode)
    {
        var categoryId = Guid.NewGuid();
        var keptTagId = Guid.NewGuid();
        var service = Create(categoryId: categoryId, tagIds: [keptTagId]).Value;

        var result = Update(service, name, internalDescription, clientDescription, pricingType, price, Guid.NewGuid(), tagIds);

        result.IsFailure.Should().BeTrue(rule);
        result.Error.Code.Should().Be(expectedCode, rule);
        service.Name.Should().Be("Haircut");
        service.InternalDescription.Should().Be("Only for the team");
        service.ClientDescription.Should().Be("A classic cut");
        service.DurationMinutes.Should().Be(30);
        service.PricingType.Should().Be(PricingType.Fixed);
        service.Price.Should().Be(ServiceTestData.Price());
        service.MaxDiscountPercentage.Should().Be(ServiceTestData.Discount());
        service.CategoryId.Should().Be(categoryId);
        service.Tags.Should().ContainSingle().Which.TagId.Should().Be(keptTagId);
    }

    [Fact]
    public void Inactivate_OnAnActiveService_MakesItInactive()
    {
        var service = Create().Value;

        var result = service.Inactivate();

        result.IsSuccess.Should().BeTrue();
        service.Status.Should().Be(ServiceStatus.Inactive);
    }

    [Fact]
    public void Inactivate_OnAnInactiveService_IsRefused()
    {
        var service = Create().Value;
        service.Inactivate();

        var result = service.Inactivate();

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.AlreadyInactive");
        service.Status.Should().Be(ServiceStatus.Inactive);
    }

    [Fact]
    public void Reactivate_OnAnInactiveService_MakesItActiveAgain()
    {
        var service = Create().Value;
        service.Inactivate();

        var result = service.Reactivate();

        result.IsSuccess.Should().BeTrue();
        service.Status.Should().Be(ServiceStatus.Active);
    }

    [Fact]
    public void Reactivate_OnAnActiveService_IsRefused()
    {
        var service = Create().Value;

        var result = service.Reactivate();

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Service.AlreadyActive");
        service.Status.Should().Be(ServiceStatus.Active);
    }

    [Fact]
    public void Inactivating_KeepsEveryOtherFieldAndTheTags()
    {
        var tagId = Guid.NewGuid();
        var service = Create(tagIds: [tagId]).Value;

        service.Inactivate();
        service.Reactivate();

        service.Name.Should().Be("Haircut");
        service.Price.Should().Be(ServiceTestData.Price());
        service.Tags.Should().ContainSingle().Which.TagId.Should().Be(tagId);
    }

    [Fact]
    public void AssignTenant_WithValidTenant_SetsTenantId()
    {
        var service = Create().Value;
        var tenantId = Guid.NewGuid();

        service.AssignTenant(tenantId);

        service.TenantId.Should().Be(tenantId);
    }

    [Fact]
    public void AssignTenant_WithEmptyTenant_Throws()
    {
        var service = Create().Value;

        var act = () => service.AssignTenant(Guid.Empty);

        act.Should().Throw<InvalidOperationException>();
    }

    [Fact]
    public void MarkCreated_SetsCreatedAtAndCreatedBy()
    {
        var service = Create().Value;
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        service.MarkCreated(actorId, now);

        service.CreatedAt.Should().Be(now);
        service.CreatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkDeleted_SetsDeletedAtAndDeletedByAndIsDeleted()
    {
        var service = Create().Value;
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        service.IsDeleted.Should().BeFalse();

        service.MarkDeleted(actorId, now);

        service.DeletedAt.Should().Be(now);
        service.DeletedBy.Should().Be(actorId);
        service.IsDeleted.Should().BeTrue();
    }
}
