using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.UpdateService;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.UpdateService;

public class UpdateServiceCommandHandlerTests
{
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly ICategoryRepository _categoryRepository = Substitute.For<ICategoryRepository>();
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<UpdateServiceCommandHandler> _logger =
        Substitute.For<ILogger<UpdateServiceCommandHandler>>();
    private readonly UpdateServiceCommandHandler _handler;

    public UpdateServiceCommandHandlerTests()
    {
        _serviceRepository.FindByNameAsync(Arg.Any<string>(), Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Service?>(null));
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new UpdateServiceCommandHandler(
            _serviceRepository,
            _categoryRepository,
            _tagRepository,
            _unitOfWork,
            _logger);
    }

    private static UpdateServiceCommand Command(
        Guid serviceId,
        string name = "Haircut",
        string? description = null,
        int durationMinutes = 30,
        int minDurationMinutes = 15,
        int maxDurationMinutes = 60,
        decimal price = 45.50m,
        decimal maxDiscountPercentage = 10m,
        Guid? categoryId = null,
        IReadOnlyList<Guid>? tagIds = null) =>
        new(
            serviceId,
            name,
            description,
            durationMinutes,
            minDurationMinutes,
            maxDurationMinutes,
            price,
            maxDiscountPercentage,
            categoryId,
            tagIds);

    private Service ExistingService(
        string name = "Haircut",
        Guid? categoryId = null,
        IReadOnlyCollection<Guid>? tagIds = null)
    {
        var service = ServiceTestData.NewService(name, categoryId, tagIds: tagIds);
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        return service;
    }

    [Fact]
    public async Task Handle_WithValidCommand_UpdatesAndPersists()
    {
        var service = ExistingService();

        var result = await _handler.Handle(
            Command(service.Id, "Massage", "Relaxing", 90, 60, 120, 90m, 25m),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Id.Should().Be(service.Id);
        result.Value.Name.Should().Be("Massage");
        result.Value.Description.Should().Be("Relaxing");
        result.Value.DurationMinutes.Should().Be(90);
        result.Value.MinDurationMinutes.Should().Be(60);
        result.Value.MaxDurationMinutes.Should().Be(120);
        result.Value.Price.Should().Be(90m);
        result.Value.MaxDiscountPercentage.Should().Be(25m);
        result.Value.Code.Should().Be(1);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithCategoryAndTags_ReturnsTheirNames()
    {
        var service = ExistingService();
        var category = ServiceTestData.NewCategory("Hair");
        var tag = ServiceTestData.NewTag();
        _categoryRepository.GetByIdAsync(category.Id, Arg.Any<CancellationToken>()).Returns(category);
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { tag });

        var result = await _handler.Handle(
            Command(service.Id, categoryId: category.Id, tagIds: [tag.Id]),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.CategoryId.Should().Be(category.Id);
        result.Value.CategoryName.Should().Be("Hair");
        result.Value.Tags.Should().ContainSingle(t => t.Id == tag.Id);
        service.Tags.Should().ContainSingle().Which.TagId.Should().Be(tag.Id);
    }

    [Fact]
    public async Task Handle_TreatsTheTagIdsAsTheFinalList()
    {
        var droppedTagId = Guid.NewGuid();
        var service = ExistingService(tagIds: [droppedTagId]);
        var newTag = ServiceTestData.NewTag("Premium");
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag> { newTag });

        var result = await _handler.Handle(Command(service.Id, tagIds: [newTag.Id]), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Tags.Should().ContainSingle(t => t.Id == newTag.Id);
        service.Tags.Select(link => link.TagId).Should().Equal(newTag.Id);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Handle_WithNoTagIds_RemovesEveryTagWithoutReadingAny(bool emptyList)
    {
        var service = ExistingService(tagIds: [Guid.NewGuid()]);
        IReadOnlyList<Guid>? tagIds = emptyList ? [] : null;

        var result = await _handler.Handle(Command(service.Id, tagIds: tagIds), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Tags.Should().BeEmpty();
        service.Tags.Should().BeEmpty();
        await _tagRepository.DidNotReceive()
            .GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownServiceId_ReturnsNotFoundAndReadsNothingElse()
    {
        var unknownId = Guid.NewGuid();
        _serviceRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Service?)null);

        var result = await _handler.Handle(Command(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Service.NotFound");
        await _serviceRepository.DidNotReceive().FindByNameAsync(Arg.Any<string>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_RenamingToAnotherServicesName_ReturnsAFieldConflictPointingAtIt()
    {
        var service = ExistingService();
        var other = ServiceTestData.NewService("Massage", code: 2);
        _serviceRepository.FindByNameAsync("Massage", Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Service?>(other));

        var result = await _handler.Handle(Command(service.Id, "Massage"), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.DuplicateName");
        var fieldError = result.Error.FieldErrors!["Name"].Should().ContainSingle().Subject;
        fieldError.Meta.Should().BeEquivalentTo(new Dictionary<string, string>
        {
            ["serviceId"] = other.Id.ToString(),
            ["serviceName"] = "Massage",
        });
        service.Name.Should().Be("Haircut");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_KeepingItsOwnName_IsNotAConflict()
    {
        var service = ExistingService();
        _serviceRepository.FindByNameAsync("Haircut", Arg.Any<CancellationToken>())
            .Returns(Task.FromResult<Service?>(service));

        var result = await _handler.Handle(Command(service.Id, "Haircut"), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Handle_WithUnknownCategoryId_ReturnsNotFound()
    {
        var service = ExistingService();
        var categoryId = Guid.NewGuid();
        _categoryRepository.GetByIdAsync(categoryId, Arg.Any<CancellationToken>()).Returns((Category?)null);

        var result = await _handler.Handle(Command(service.Id, categoryId: categoryId), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Category.NotFound");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFound()
    {
        var service = ExistingService();
        _tagRepository.GetByIdsAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>())
            .Returns(new List<Tag>());

        var result = await _handler.Handle(Command(service.Id, tagIds: [Guid.NewGuid()]), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Tag.NotFound");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WhenTheDomainRejects_ReturnsTheNamedErrorAndDoesNotSave()
    {
        var service = ExistingService();

        var result = await _handler.Handle(Command(service.Id, name: ""), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Validation);
        result.Error.Code.Should().Be("Service.NameRequired");
        service.Name.Should().Be("Haircut");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_LoadsTheServiceExactlyOnce()
    {
        var service = ExistingService();

        await _handler.Handle(Command(service.Id), CancellationToken.None);

        await _serviceRepository.Received(1).GetByIdAsync(service.Id, Arg.Any<CancellationToken>());
    }

    [Theory]
    [InlineData("IX_Services_TenantId_NameNormalized")]
    [InlineData(null)]
    public async Task Handle_WhenTheDatabaseRejectsTheSave_ReturnsAGenericConflict(string? constraint)
    {
        var service = ExistingService();
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(
            PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, constraint)));

        var result = await _handler.Handle(Command(service.Id), CancellationToken.None);

        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.SaveFailed");
        result.Error.FieldErrors.Should().BeNull();
    }
}
