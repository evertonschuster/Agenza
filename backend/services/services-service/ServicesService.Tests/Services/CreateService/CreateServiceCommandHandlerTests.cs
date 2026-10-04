using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.CreateService;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.CreateService;

public class CreateServiceCommandHandlerTests
{
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly IServiceCodeGenerator _serviceCodeGenerator = Substitute.For<IServiceCodeGenerator>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<CreateServiceCommandHandler> _logger =
        Substitute.For<ILogger<CreateServiceCommandHandler>>();
    private readonly CreateServiceCommandHandler _handler;

    public CreateServiceCommandHandlerTests()
    {
        _serviceRepository.FindByNameAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Service?>(null));
        _serviceCodeGenerator.GetNextCodeAsync(Arg.Any<CancellationToken>()).Returns(1);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new CreateServiceCommandHandler(
            _serviceRepository,
            _categoryRepository,
            _tagRepository,
            _serviceCodeGenerator,
            _unitOfWork,
            _logger);
    }

    private static CreateServiceCommand Command(
        string name = "Haircut",
        Guid? categoryId = null,
        IReadOnlyList<Guid>? tagIds = null,
        string? internalDescription = "Only for the team",
        string? clientDescription = "A classic cut",
        int durationMinutes = 30,
        int? preparationMinutes = null,
        int? cleanupMinutes = null,
        int? minDurationMinutes = 15,
        int? maxDurationMinutes = 60,
        string pricingType = "fixed",
        decimal? price = 45.50m,
        decimal? maxDiscountPercentage = 10m) =>
        new(
            name,
            categoryId,
            tagIds,
            internalDescription,
            clientDescription,
            durationMinutes,
            preparationMinutes,
            cleanupMinutes,
            minDurationMinutes,
            maxDurationMinutes,
            pricingType,
            price,
            maxDiscountPercentage);

    [Fact]
    public async Task Handle_WithValidCommand_PersistsAnActiveServiceAndReturnsIt()
    {
        var result = await _handler.Handle(Command(), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        var response = result.Value;
        response.Id.Should().NotBe(Guid.Empty);
        response.Code.Should().Be(1);
        response.Name.Should().Be("Haircut");
        response.InternalDescription.Should().Be("Only for the team");
        response.ClientDescription.Should().Be("A classic cut");
        response.DurationMinutes.Should().Be(30);
        response.MinDurationMinutes.Should().Be(15);
        response.MaxDurationMinutes.Should().Be(60);
        response.PricingType.Should().Be("fixed");
        response.Price.Should().Be(45.50m);
        response.MaxDiscountPercentage.Should().Be(10m);
        response.Status.Should().Be("active");
        response.CategoryId.Should().BeNull();
        response.CategoryName.Should().BeNull();
        response.Tags.Should().BeEmpty();
        _serviceRepository.Received(1).Add(Arg.Is<Service>(service => service.Id == response.Id));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithPreparationAndCleanup_ReturnsTheTotalTimeToReserve()
    {
        var result = await _handler.Handle(Command(preparationMinutes: 10, cleanupMinutes: 5), CancellationToken.None);

        result.Value.PreparationMinutes.Should().Be(10);
        result.Value.CleanupMinutes.Should().Be(5);
        result.Value.TotalDurationMinutes.Should().Be(45);
    }

    [Fact]
    public async Task Handle_WithoutPreparationAndCleanup_ReservesOnlyTheDuration()
    {
        var result = await _handler.Handle(Command(preparationMinutes: null, cleanupMinutes: null), CancellationToken.None);

        result.Value.PreparationMinutes.Should().Be(0);
        result.Value.CleanupMinutes.Should().Be(0);
        result.Value.TotalDurationMinutes.Should().Be(30);
    }

    [Fact]
    public async Task Handle_WithVariablePricing_PersistsWithoutAFixedAmount()
    {
        var result = await _handler.Handle(Command(pricingType: "variable", price: null), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.PricingType.Should().Be("variable");
        result.Value.Price.Should().BeNull();
    }

    [Fact]
    public async Task Handle_WithFixedPriceZero_PersistsAFreeService()
    {
        var result = await _handler.Handle(Command(price: 0m), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Price.Should().Be(0m);
    }

    [Fact]
    public async Task Handle_WithoutLimitsAndMaxDiscount_PersistsThemAsNull()
    {
        var result = await _handler.Handle(
            Command(minDurationMinutes: null, maxDurationMinutes: null, maxDiscountPercentage: null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.MinDurationMinutes.Should().BeNull();
        result.Value.MaxDurationMinutes.Should().BeNull();
        result.Value.MaxDiscountPercentage.Should().BeNull();
    }

    [Fact]
    public async Task Handle_WithCategoryAndTags_LinksThemAndReturnsTheirNames()
    {
        var category = ServiceTestData.NewCategory("Hair");
        var vip = ServiceTestData.NewTag("VIP");
        var premium = ServiceTestData.NewTag("Premium", "#ef4444");
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { premium, vip });

        var result = await _handler.Handle(
            Command(categoryId: category.Id, tagIds: [vip.Id, premium.Id]),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.CategoryId.Should().Be(category.Id);
        result.Value.CategoryName.Should().Be("Hair");
        result.Value.Tags.Select(tag => tag.Name).Should().Equal("Premium", "VIP");
        result.Value.Tags.Select(tag => tag.Color).Should().Equal("#ef4444", "#0d9488");
        _serviceRepository.Received(1).Add(Arg.Is<Service>(service =>
            service.Tags.Select(link => link.TagId).OrderBy(id => id).SequenceEqual(new[] { vip.Id, premium.Id }.OrderBy(id => id))));
    }

    [Fact]
    public async Task Handle_WithTheNameOfAnExistingService_ReturnsAFieldConflictPointingAtIt()
    {
        var existing = ServiceTestData.NewService("Haircut");
        _serviceRepository.FindByNameAsync("Haircut", Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Service?>(existing));

        var result = await _handler.Handle(Command(), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.DuplicateName");
        var fieldError = result.Error.FieldErrors!["Name"].Should().ContainSingle().Subject;
        fieldError.Code.Should().Be("Service.DuplicateName");
        fieldError.Meta.Should().BeEquivalentTo(new Dictionary<string, string>
        {
            ["serviceId"] = existing.Id.ToString(),
            ["serviceName"] = "Haircut",
        });
        await _serviceCodeGenerator.DidNotReceive().GetNextCodeAsync(Arg.Any<CancellationToken>());
        _serviceRepository.DidNotReceive().Add(Arg.Any<Service>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithTheNameOfAnInactiveService_StillReturnsTheConflict()
    {
        var existing = ServiceTestData.NewService("Haircut");
        existing.Inactivate();
        _serviceRepository.FindByNameAsync("Haircut", Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Service?>(existing));

        var result = await _handler.Handle(Command(), CancellationToken.None);

        result.Error.Code.Should().Be("Service.DuplicateName");
    }

    [Fact]
    public async Task Handle_WithUnknownCategoryId_ReturnsNotFoundBeforeGeneratingACode()
    {
        var categoryId = Guid.NewGuid();
        _categoryRepository.GetByIdAsync(categoryId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _handler.Handle(Command(categoryId: categoryId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Category.NotFound");
        await _serviceCodeGenerator.DidNotReceive().GetNextCodeAsync(Arg.Any<CancellationToken>());
        _serviceRepository.DidNotReceive().Add(Arg.Any<Service>());
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFoundBeforeGeneratingACode()
    {
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var result = await _handler.Handle(Command(tagIds: [Guid.NewGuid()]), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Tag.NotFound");
        await _serviceCodeGenerator.DidNotReceive().GetNextCodeAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithoutTags_DoesNotReadThem()
    {
        await _handler.Handle(Command(tagIds: null), CancellationToken.None);
        await _handler.Handle(Command(tagIds: []), CancellationToken.None);

        await _tagRepository.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ReadsTheCategoryAndTheTagsExactlyOnce()
    {
        var category = ServiceTestData.NewCategory();
        var tag = ServiceTestData.NewTag();
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { tag });

        await _handler.Handle(Command(categoryId: category.Id, tagIds: [tag.Id]), CancellationToken.None);

        await _categoryRepository.Received(1).GetByIdAsync(category.Id, Arg.Any<CancellationToken>());
        await _tagRepository.Received(1).GetByIdsAsync(
            Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Count == 1 && ids.Contains(tag.Id)),
            Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenTheDomainRejectsAfterTheCodeWasGenerated_RollsBackAndDoesNotSave()
    {
        var result = await _handler.Handle(Command(name: ""), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
        result.Error.Code.Should().Be("Service.NameRequired");
        await _serviceCodeGenerator.Received(1).GetNextCodeAsync(Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).RollbackAsync(Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
        _serviceRepository.DidNotReceive().Add(Arg.Any<Service>());
    }

    [Theory]
    [InlineData("hourly", null, "PricingType.Unknown")]
    [InlineData("fixed", null, "Service.PriceRequired")]
    [InlineData("variable", 10, "Service.PriceNotAllowed")]
    public async Task Handle_WithAPricingTheValidatorWouldHaveRefused_RollsBackAndDoesNotSave(
        string pricingType,
        int? price,
        string expectedCode)
    {
        var result = await _handler.Handle(Command(pricingType: pricingType, price: price), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Validation);
        result.Error.Code.Should().Be(expectedCode);
        await _unitOfWork.Received(1).RollbackAsync(Arg.Any<CancellationToken>());
        _serviceRepository.DidNotReceive().Add(Arg.Any<Service>());
    }

    [Theory]
    [InlineData(0, "ServiceDuration.DurationOutOfRange")]
    [InlineData(5, "ServiceDuration.DurationBelowMin")]
    [InlineData(61, "ServiceDuration.DurationAboveMax")]
    public async Task Handle_WithADurationTheValidatorWouldHaveRefused_ReturnsTheNamedError(int duration, string expectedCode)
    {
        var result = await _handler.Handle(Command(durationMinutes: duration), CancellationToken.None);

        result.Error.Code.Should().Be(expectedCode);
        await _unitOfWork.Received(1).RollbackAsync(Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData(-1, "Money.Negative")]
    [InlineData(45.123, "Money.InvalidPrecision")]
    public async Task Handle_WithAPriceTheValidatorWouldHaveRefused_ReturnsTheNamedError(double price, string expectedCode)
    {
        var result = await _handler.Handle(Command(price: (decimal)price), CancellationToken.None);

        result.Error.Code.Should().Be(expectedCode);
    }

    [Fact]
    public async Task Handle_WithAMaxDiscountTheValidatorWouldHaveRefused_ReturnsTheNamedError()
    {
        var result = await _handler.Handle(Command(maxDiscountPercentage: 150m), CancellationToken.None);

        result.Error.Code.Should().Be("Percentage.OutOfRange");
    }

    [Fact]
    public async Task Handle_WithRepeatedTagIds_FailsInTheDomainInsteadOfReportingAMissingTag()
    {
        var tag = ServiceTestData.NewTag();
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { tag });

        var result = await _handler.Handle(Command(tagIds: [tag.Id, tag.Id]), CancellationToken.None);

        result.Error.Code.Should().Be("Service.DuplicateTags");
        _serviceRepository.DidNotReceive().Add(Arg.Any<Service>());
    }

    [Theory]
    [InlineData("IX_Services_TenantId_NameNormalized")]
    [InlineData("IX_Services_TenantId_Code")]
    [InlineData(null)]
    public async Task Handle_WhenTheDatabaseRejectsTheSave_ReturnsAGenericConflict(string? constraint)
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(
            PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, constraint)));

        var result = await _handler.Handle(Command(), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.SaveFailed");
        result.Error.FieldErrors.Should().BeNull();
    }
}
