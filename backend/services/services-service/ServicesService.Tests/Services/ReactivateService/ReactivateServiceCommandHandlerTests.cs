using Admin.SharedKernel;
using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.ReactivateService;

namespace ServicesService.Tests.Services.ReactivateService;

public class ReactivateServiceCommandHandlerTests
{
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ReactivateServiceCommandHandler _handler;

    public ReactivateServiceCommandHandlerTests()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(PersistenceResult.Success(1));
        _handler = new ReactivateServiceCommandHandler(
            _serviceRepository,
            _unitOfWork);
    }

    private static Service NewInactiveService()
    {
        var service = Service.Create(Guid.NewGuid(), "Limpeza", null, DurationRange.Create(15, 30, 60).Value, 120m, 10m, null, 1, ServiceModality.InPersonOnly).Value;
        service.Inactivate();
        return service;
    }

    [Fact]
    public async Task Handle_ComServicoIndisponivel_TornaDisponivelEPersiste()
    {
        var service = NewInactiveService();
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(new ReactivateServiceCommand(service.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(ServiceStatus.Active);
        await _serviceRepository.Received(1).UpdateAsync(service, Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ComServicoJaDisponivel_DevolveOServicoSemSalvarDeNovo()
    {
        var service = Service.Create(Guid.NewGuid(), "Limpeza", null, DurationRange.Create(15, 30, 60).Value, 120m, 10m, null, 1, ServiceModality.InPersonOnly).Value;
        _serviceRepository.GetByIdAsync(service.Id, Arg.Any<CancellationToken>()).Returns(service);

        var result = await _handler.Handle(new ReactivateServiceCommand(service.Id), CancellationToken.None);

        result.IsSuccess.Should().BeTrue();
        result.Value.Status.Should().Be(ServiceStatus.Active);
        await _unitOfWork.DidNotReceive().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task Handle_ComServicoInexistente_DevolveNaoEncontrado()
    {
        var unknownId = Guid.NewGuid();
        _serviceRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Service?)null);

        var result = await _handler.Handle(new ReactivateServiceCommand(unknownId), CancellationToken.None);

        result.IsFailure.Should().BeTrue();
        result.Error.Type.Should().Be(ErrorType.NotFound);
        result.Error.Code.Should().Be("Service.NotFound");
    }
}
