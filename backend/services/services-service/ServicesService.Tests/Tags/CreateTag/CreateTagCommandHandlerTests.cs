using Admin.SharedKernel;
using ServicesService.Application.Tags.CreateTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;
using ServicesService.Tests.TestDoubles;

namespace ServicesService.Tests.Tags.CreateTag;

public class CreateTagCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheTag()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeTagRepository();
        var unitOfWork = new FakeUnitOfWork();
        var handler = new CreateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateTagCommand(tenantId, "VIP", "#0d9488", "High-value client"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("VIP");
        result.Value.Color.Should().Be("#0d9488");
        result.Value.Description.Should().Be("High-value client");
        repository.Tags.Should().ContainSingle(tag => tag.Id == result.Value.Id);
        unitOfWork.SaveChangesCalls.Should().Be(1);
    }

    [Fact]
    public async Task Handle_WithDuplicateNameInSameTenant_ReturnsConflictAndDoesNotPersist()
    {
        var tenantId = Guid.NewGuid();
        var repository = new FakeTagRepository();
        repository.Tags.Add(new Tag(Guid.NewGuid(), tenantId, "VIP", TagColor.From("#0d9488"), null));
        var unitOfWork = new FakeUnitOfWork();
        var handler = new CreateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateTagCommand(tenantId, "vip", "#ef4444", null), // case-insensitive match
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Tag.DuplicateName");
        repository.Tags.Should().HaveCount(1);
        unitOfWork.SaveChangesCalls.Should().Be(0);
    }

    [Fact]
    public async Task Handle_WithSameNameInDifferentTenant_Succeeds()
    {
        var repository = new FakeTagRepository();
        repository.Tags.Add(new Tag(Guid.NewGuid(), Guid.NewGuid(), "VIP", TagColor.From("#0d9488"), null));
        var handler = new CreateTagCommandHandler(repository, new FakeUnitOfWork());

        var result = await handler.Handle(
            new CreateTagCommand(Guid.NewGuid(), "VIP", "#0d9488", null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("VIP");
    }

    [Fact]
    public async Task Handle_WithInvalidColor_ReturnsValidationErrorAndDoesNotPersist()
    {
        var repository = new FakeTagRepository();
        var unitOfWork = new FakeUnitOfWork();
        var handler = new CreateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateTagCommand(Guid.NewGuid(), "VIP", "#123456", null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
        repository.Tags.Should().BeEmpty();
        unitOfWork.SaveChangesCalls.Should().Be(0);
    }
}
