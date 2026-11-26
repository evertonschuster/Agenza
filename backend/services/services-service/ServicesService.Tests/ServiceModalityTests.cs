namespace ServicesService.Tests;

public class ServiceModalityTests
{
    private static readonly DurationRange Duration = DurationRange.Create(15, 30, 60).Value;

    private static Service NewService(ServiceModality? modality = null) =>
        Service.Create(Guid.NewGuid(), "Consulta", null, Duration, 150m, 0m, null, 1, modality).Value;

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    [InlineData(true, true)]
    public void Create_ComPeloMenosUmaModalidade_GuardaOsDoisFatos(bool presencial, bool online)
    {
        var result = ServiceModality.Create(presencial, online);

        result.IsSuccess.Should().BeTrue();
        result.Value.AttendsInPerson.Should().Be(presencial);
        result.Value.AttendsOnline.Should().Be(online);
    }

    [Fact]
    public void Create_SemNenhumaModalidade_RetornaFalha()
    {
        var result = ServiceModality.Create(attendsInPerson: false, attendsOnline: false);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(ServiceModality.Required);
        result.Error.Code.Should().Be("Service.ModalityRequired");
    }

    [Fact]
    public void Restore_ReconstroiSemValidar()
    {
        var modality = ServiceModality.Restore(attendsInPerson: false, attendsOnline: false);

        modality.AttendsInPerson.Should().BeFalse();
        modality.AttendsOnline.Should().BeFalse();
    }

    [Fact]
    public void ServiceCreate_SemModalidade_AtendeSomentePresencial()
    {
        var service = NewService();

        service.AttendsInPerson.Should().BeTrue();
        service.AttendsOnline.Should().BeFalse();
    }

    [Fact]
    public void ServiceCreate_ComModalidade_GuardaAModalidade()
    {
        var service = NewService(ServiceModality.Create(attendsInPerson: false, attendsOnline: true).Value);

        service.AttendsInPerson.Should().BeFalse();
        service.AttendsOnline.Should().BeTrue();
    }

    [Fact]
    public void ServiceUpdate_SemModalidade_MantemAModalidadeAtual()
    {
        var service = NewService(ServiceModality.Create(attendsInPerson: true, attendsOnline: true).Value);

        var result = service.Update("Consulta nova", null, Duration, 150m, 0m, null);

        result.IsSuccess.Should().BeTrue();
        service.AttendsInPerson.Should().BeTrue();
        service.AttendsOnline.Should().BeTrue();
    }

    [Fact]
    public void ServiceUpdate_ComModalidade_SubstituiAModalidade()
    {
        var service = NewService();

        var result = service.Update(
            "Consulta", null, Duration, 150m, 0m, null, ServiceModality.Create(attendsInPerson: false, attendsOnline: true).Value);

        result.IsSuccess.Should().BeTrue();
        service.AttendsInPerson.Should().BeFalse();
        service.AttendsOnline.Should().BeTrue();
    }

    [Fact]
    public void ServiceUpdate_RejeitadoPorOutroCampo_NaoAlteraAModalidade()
    {
        var service = NewService();

        var result = service.Update(
            "Consulta", null, Duration, -1m, 0m, null, ServiceModality.Create(attendsInPerson: false, attendsOnline: true).Value);

        result.IsFailure.Should().BeTrue();
        service.AttendsInPerson.Should().BeTrue();
        service.AttendsOnline.Should().BeFalse();
    }
}
