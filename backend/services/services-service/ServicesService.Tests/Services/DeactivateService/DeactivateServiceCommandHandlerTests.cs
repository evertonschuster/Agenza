using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.DeactivateService;

namespace ServicesService.Tests.Services.DeactivateService;

public class DeactivateServiceCommandHandlerTests
{
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly DeactivateServiceCommandHandler _handler;

    public DeactivateServiceCommandHandlerTests()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new DeactivateServiceCommandHandler(
            _serviceRepository,
            _unitOfWork);
    }

    private static Service NewService(Guid? categoryId = null) =>
        Service.Create(Guid.NewGuid(), "Limpeza", null, DurationRange.Create(15, 30, 60).Value, 120m, 10m, categoryId, 1).Value;

    [Fact]
    public async Task Handle_ComServicoDisponivel_TornaIndisponivelEPersiste()
    {
        var service = NewService();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(new DeactivateServiceCommand(service.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(ServiceStatus.Inactive);
        service.Status.Should().Be(ServiceStatus.Inactive);
        await _serviceRepository.Received(1).UpdateAsync(service, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ComServicoJaIndisponivel_DevolveOServicoSemSalvarDeNovo()
    {
        var service = NewService();
        service.Inactivate();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(new DeactivateServiceCommand(service.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(ServiceStatus.Inactive);
        await _serviceRepository.DidNotReceive().UpdateAsync(Arg.Any<Service>(), Arg.Any<CancellationToken>());
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ComServicoInexistente_DevolveNaoEncontrado()
    {
        var unknownId = Guid.NewGuid();
        _serviceRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Service?)null);

        var result = await _handler.Handle(new DeactivateServiceCommand(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Service.NotFound");
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ComCategoria_DevolveONomeDaCategoria()
    {
        var category = Category.Create(Guid.NewGuid(), "Odontologia").Value;
        var service = NewService(category.Id);
        typeof(Service).GetProperty(nameof(Service.Category))!.SetValue(service, category);
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(new DeactivateServiceCommand(service.Id), CancellationToken.None);

        result.Value.CategoryName.Should().Be("Odontologia");
    }

    [Fact]
    public async Task Handle_QuandoOSalvamentoFalha_DevolveConflito()
    {
        var service = NewService();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>())
            .Returns(PersistenceResult.Failure<int>(
                new PersistenceError(PersistenceErrorKind.UniqueConstraintViolation, "some_other_unique_constraint")));

        var result = await _handler.Handle(new DeactivateServiceCommand(service.Id), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.Conflict);
        result.Error.Code.Should().Be("Service.SaveFailed");
    }
}
