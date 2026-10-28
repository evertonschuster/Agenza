using Admin.SharedKernel;
using Microsoft.Extensions.Logging;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Tags;
using ServicesService.Application.Tags.DeleteTag;

namespace ServicesService.Tests.Tags.DeleteTag;

public class DeleteTagCommandHandlerTests
{
    private readonly ITagRepository _tagRepository = Substitute.For<ITagRepository>();
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly IClientRepository _clientRepository = Substitute.For<IClientRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ILogger<DeleteTagCommandHandler> _logger =
        Substitute.For<ILogger<DeleteTagCommandHandler>>();
    private readonly DeleteTagCommandHandler _handler;

    public DeleteTagCommandHandlerTests()
    {
        _serviceRepository.CountByTagIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(0);
        _clientRepository.CountByTagIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(0);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new DeleteTagCommandHandler(_tagRepository, _serviceRepository, _clientRepository, _unitOfWork, _logger);
    }

    [Fact]
    public async Task Handle_WithExistingUnusedTag_RemovesItAndCommits()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
        _tagRepository.GetForUpdateAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);

        var result = await _handler.Handle(new DeleteTagCommand(tag.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        _tagRepository.Received(1).Remove(tag);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithUnknownTagId_ReturnsNotFound()
    {
        var unknownId = Guid.NewGuid();
        _tagRepository.GetForUpdateAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Tag?)null);

        var result = await _handler.Handle(new DeleteTagCommand(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Tag.NotFound");
    }

    [Theory]
    [InlineData(2, 0, "Esta etiqueta está em uso por 2 serviço(s) e não pode ser excluída.")]
    [InlineData(0, 3, "Esta etiqueta está em uso por 3 pessoa(s) e não pode ser excluída.")]
    [InlineData(2, 3, "Esta etiqueta está em uso por 2 serviço(s) e 3 pessoa(s) e não pode ser excluída.")]
    public async Task Handle_WithTagInUse_ReturnsConflictAndDoesNotRemove(int serviceCount, int clientCount, string expectedMessage)
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
        _tagRepository.GetForUpdateAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        _serviceRepository.CountByTagIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(serviceCount);
        _clientRepository.CountByTagIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(clientCount);

        var result = await _handler.Handle(new DeleteTagCommand(tag.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Tag.InUse");
        result.Error.Message.Should().Be(expectedMessage);
        _tagRepository.DidNotReceive().Remove(Arg.Any<Tag>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_WithConcurrentConflictAtSaveTime_ReturnsConflict()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
        _tagRepository.GetForUpdateAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "some_other_unique_constraint")));

        var result = await _handler.Handle(new DeleteTagCommand(tag.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
    }

    [Fact]
    public async Task Handle_WithTagInUse_ListsUpToTenServicesAndClientsWithTheirIdAndName()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
        var haircut = new TagUsage(Guid.NewGuid(), "Corte");
        var ana = new TagUsage(Guid.NewGuid(), "Ana Lima");
        var bia = new TagUsage(Guid.NewGuid(), "Bia Souza");
        _tagRepository.GetForUpdateAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        _serviceRepository.CountByTagIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(1);
        _clientRepository.CountByTagIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(12);
        _serviceRepository.ListByTagIdAsync(tag.Id, 10, Arg.Any<CancellationToken>()).Returns([haircut]);
        _clientRepository.ListByTagIdAsync(tag.Id, 10, Arg.Any<CancellationToken>()).Returns([ana, bia]);

        var result = await _handler.Handle(new DeleteTagCommand(tag.Id), CancellationToken.None);

        var fieldErrors = result.Error.FieldErrors!;
        var service = fieldErrors["Services"].Should().ContainSingle().Subject;
        service.Code.Should().Be("Tag.InUse");
        service.Message.Should().Be("Serviço que usa esta etiqueta: Corte.");
        service.Meta.Should().Equal(new Dictionary<string, string> { ["id"] = haircut.Id.ToString(), ["name"] = "Corte" });
        var clientNames = fieldErrors["Clients"].Select(error => error.Meta!["name"]);
        clientNames.Should().Equal("Ana Lima", "Bia Souza");
        fieldErrors["Clients"][1].Message.Should().Be("Pessoa que usa esta etiqueta: Bia Souza.");
        result.Error.Message.Should().Be("Esta etiqueta está em uso por 1 serviço(s) e 12 pessoa(s) e não pode ser excluída.");
    }

    [Fact]
    public async Task Handle_WithTagUsedOnlyByServices_DoesNotReadNorListClients()
    {
        var tag = Tag.Create(Guid.NewGuid(), "VIP", TagColor.Create("#0d9488").Value, null).Value;
        _tagRepository.GetForUpdateAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(tag);
        _serviceRepository.CountByTagIdAsync(tag.Id, Arg.Any<CancellationToken>()).Returns(2);
        _serviceRepository.ListByTagIdAsync(tag.Id, 10, Arg.Any<CancellationToken>())
            .Returns([new TagUsage(Guid.NewGuid(), "Corte"), new TagUsage(Guid.NewGuid(), "Barba")]);

        var result = await _handler.Handle(new DeleteTagCommand(tag.Id), CancellationToken.None);

        result.Error.FieldErrors.Should().ContainKey("Services").And.NotContainKey("Clients");
        await _clientRepository.DidNotReceive().ListByTagIdAsync(Arg.Any<Guid>(), Arg.Any<int>(), Arg.Any<CancellationToken>());
    }
}
