namespace ServicesService.Tests;

public class ServiceStatusTests
{
    private static Service NewService() =>
        Service.Create(Guid.NewGuid(), "Limpeza", null, DurationRange.Create(15, 30, 60).Value, 120m, 10m, null, 1).Value;

    [Fact]
    public void Criar_ComecaDisponivelParaAgendamento()
    {
        NewService().Status.Should().Be(ServiceStatus.Active);
    }

    [Fact]
    public void Inactivate_ComServicoDisponivel_TornaIndisponivel()
    {
        var service = NewService();

        var result = service.Inactivate();

        result.IsSuccess.Should().BeTrue();
        service.Status.Should().Be(ServiceStatus.Inactive);
    }

    [Fact]
    public void Inactivate_ComServicoJaIndisponivel_RecusaComAlreadyInactive()
    {
        var service = NewService();
        service.Inactivate();

        var result = service.Inactivate();

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(Service.AlreadyInactive);
        service.Status.Should().Be(ServiceStatus.Inactive);
    }

    [Fact]
    public void Reactivate_ComServicoIndisponivel_TornaDisponivelDeNovo()
    {
        var service = NewService();
        service.Inactivate();

        var result = service.Reactivate();

        result.IsSuccess.Should().BeTrue();
        service.Status.Should().Be(ServiceStatus.Active);
    }

    [Fact]
    public void Reactivate_ComServicoJaDisponivel_RecusaComAlreadyActive()
    {
        var service = NewService();

        var result = service.Reactivate();

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(Service.AlreadyActive);
        service.Status.Should().Be(ServiceStatus.Active);
    }

    [Fact]
    public void Inactivate_MantemOsDadosDoServico()
    {
        var service = NewService();

        service.Inactivate();

        service.Name.Should().Be("Limpeza");
        service.Price.Should().Be(120m);
        service.DurationMinutes.Should().Be(30);
    }

    [Fact]
    public void Update_NaoAlteraASituacao()
    {
        var service = NewService();
        service.Inactivate();

        var result = service.Update("Limpeza 2", null, DurationRange.Create(15, 30, 60).Value, 130m, 10m, null, ServiceModality.InPersonOnly);

        result.IsSuccess.Should().BeTrue();
        service.Status.Should().Be(ServiceStatus.Inactive);
    }
}
