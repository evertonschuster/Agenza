using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags.CreateTag;
using ServicesService.Domain.Entities;
using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Tags.CreateTag;

public class CreateTagCommandHandlerTests
{
    [Fact]
    public async Task Handle_WithValidCommand_PersistsAndReturnsTheTag()
    {
        var tenantId = Guid.NewGuid();
        var repository = Substitute.For<ITagRepository>();
        repository.NameExistsAsync(tenantId, "VIP", null, Arg.Any<CancellationToken>()).Returns(false);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateTagCommand(tenantId, "VIP", "#0d9488", "High-value client"),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("VIP");
        result.Value.Color.Should().Be("#0d9488");
        result.Value.Description.Should().Be("High-value client");
        repository.Received(1).Add(Arg.Is<Tag>(tag => tag.Id == result.Value.Id && tag.TenantId == tenantId));
        await unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithDuplicateNameInSameTenant_ReturnsConflictAndDoesNotPersist()
    {
        var tenantId = Guid.NewGuid();
        var repository = Substitute.For<ITagRepository>();
        repository.NameExistsAsync(tenantId, "vip", null, Arg.Any<CancellationToken>()).Returns(true);
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateTagCommand(tenantId, "vip", "#ef4444", null), // case-insensitive match
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Tag.DuplicateName");
        repository.DidNotReceive().Add(Arg.Any<Tag>());
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithSameNameInDifferentTenant_Succeeds()
    {
        var repository = Substitute.For<ITagRepository>();
        repository.NameExistsAsync(Arg.Any<Guid>(), Arg.Any<string>(), Arg.Any<Guid?>(), Arg.Any<CancellationToken>())
            .Returns(false);
        var handler = new CreateTagCommandHandler(repository, Substitute.For<IUnitOfWork>());

        var result = await handler.Handle(
            new CreateTagCommand(Guid.NewGuid(), "VIP", "#0d9488", null),
            CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Name.Should().Be("VIP");
    }

    [Fact]
    public async Task Handle_WithInvalidColor_ReturnsValidationErrorAndDoesNotPersist()
    {
        var repository = Substitute.For<ITagRepository>();
        var unitOfWork = Substitute.For<IUnitOfWork>();
        var handler = new CreateTagCommandHandler(repository, unitOfWork);

        var result = await handler.Handle(
            new CreateTagCommand(Guid.NewGuid(), "VIP", "#123456", null),
            CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Validation);
        repository.DidNotReceive().Add(Arg.Any<Tag>());
        await unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }
}
