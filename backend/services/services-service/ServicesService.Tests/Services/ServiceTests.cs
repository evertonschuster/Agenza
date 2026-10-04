using ServicesService.Domain.Common;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services;

public class ServiceTests
{
    private static DomainResult<Service> Create(
        string name = "Haircut",
        string? description = "A classic cut",
        Guid? categoryId = null,
        IReadOnlyCollection<Guid>? tagIds = null) =>
        Service.Create(
            Guid.NewGuid(),
            name,
            description,
            ServiceTestData.Duration(),
            ServiceTestData.Price(),
            ServiceTestData.Discount(),
            categoryId,
            tagIds ?? [],
            1);

    private static DomainResult Update(
        Service service,
        string name = "Deep Tissue Massage",
        string? description = null,
        Guid? categoryId = null,
        IReadOnlyCollection<Guid>? tagIds = null) =>
        service.Update(
            name,
            description,
            ServiceTestData.Duration(60, 90, 120),
            ServiceTestData.Price(90m),
            ServiceTestData.Discount(25m),
            categoryId,
            tagIds ?? []);

    public static TheoryData<string, string, string?, Guid[], string> InvalidInput()
    {
        var duplicated = Guid.NewGuid();

        return new TheoryData<string, string, string?, Guid[], string>
        {
            { "blank name", "   ", null, [], "Service.NameRequired" },
            { "name over the maximum", new string('x', Service.NameMaxLength + 1), null, [], "Service.NameTooLong" },
            { "description over the maximum", "Haircut", new string('x', Service.DescriptionMaxLength + 1), [], "Service.DescriptionTooLong" },
            { "too many tags", "Haircut", null, Enumerable.Range(0, Service.MaxTags + 1).Select(_ => Guid.NewGuid()).ToArray(), "Service.TooManyTags" },
            { "empty tag id", "Haircut", null, [Guid.Empty], "Service.InvalidTag" },
            { "repeated tag id", "Haircut", null, [duplicated, duplicated], "Service.DuplicateTags" },
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
            "  A classic cut  ",
            ServiceTestData.Duration(),
            ServiceTestData.Price(),
            ServiceTestData.Discount(),
            categoryId,
            [],
            7);

        result.IsSuccess.Should().BeTrue();
        var service = result.Value;
        service.Id.Should().Be(id);
        service.TenantId.Should().Be(Guid.Empty);
        service.Code.Should().Be(7);
        service.Name.Should().Be("Haircut");
        service.Description.Should().Be("A classic cut");
        service.DurationMinutes.Should().Be(30);
        service.MinDurationMinutes.Should().Be(15);
        service.MaxDurationMinutes.Should().Be(60);
        service.Price.Should().Be(ServiceTestData.Price());
        service.MaxDiscountPercentage.Should().Be(ServiceTestData.Discount());
        service.CategoryId.Should().Be(categoryId);
        service.Tags.Should().BeEmpty();
    }

    [Fact]
    public void Create_WithoutCategory_LeavesCategoryIdNull()
    {
        Create().Value.CategoryId.Should().BeNull();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankDescription_StoresNull(string? description)
    {
        var result = Create(description: description);

        result.IsSuccess.Should().BeTrue();
        result.Value.Description.Should().BeNull();
    }

    [Fact]
    public void Create_AcceptsTheLongestNameAndTheMostTags()
    {
        var tagIds = Enumerable.Range(0, Service.MaxTags).Select(_ => Guid.NewGuid()).ToArray();

        var result = Create(name: new string('x', Service.NameMaxLength), tagIds: tagIds);

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
        string? description,
        Guid[] tagIds,
        string expectedCode)
    {
        var result = Create(name, description, tagIds: tagIds);

        result.IsFailure.Should().BeTrue(rule);
        result.Error.Code.Should().Be(expectedCode, rule);
    }

    [Fact]
    public void Update_ReplacesEveryFieldExceptTheCode()
    {
        var service = Create().Value;
        var categoryId = Guid.NewGuid();

        var result = Update(service, "  Deep Tissue Massage  ", null, categoryId);

        result.IsSuccess.Should().BeTrue();
        service.Name.Should().Be("Deep Tissue Massage");
        service.Description.Should().BeNull();
        service.DurationMinutes.Should().Be(90);
        service.MinDurationMinutes.Should().Be(60);
        service.MaxDurationMinutes.Should().Be(120);
        service.Price.Should().Be(ServiceTestData.Price(90m));
        service.MaxDiscountPercentage.Should().Be(ServiceTestData.Discount(25m));
        service.CategoryId.Should().Be(categoryId);
        service.Code.Should().Be(1);
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
        string? description,
        Guid[] tagIds,
        string expectedCode)
    {
        var categoryId = Guid.NewGuid();
        var keptTagId = Guid.NewGuid();
        var service = Create(categoryId: categoryId, tagIds: [keptTagId]).Value;

        var result = Update(service, name, description, Guid.NewGuid(), tagIds);

        result.IsFailure.Should().BeTrue(rule);
        result.Error.Code.Should().Be(expectedCode, rule);
        service.Name.Should().Be("Haircut");
        service.Description.Should().Be("A classic cut");
        service.DurationMinutes.Should().Be(30);
        service.Price.Should().Be(ServiceTestData.Price());
        service.MaxDiscountPercentage.Should().Be(ServiceTestData.Discount());
        service.CategoryId.Should().Be(categoryId);
        service.Tags.Should().ContainSingle().Which.TagId.Should().Be(keptTagId);
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
