namespace ServicesService.Tests;

public class ServiceModalityTests
{
    private static readonly DurationRange Duration = DurationRange.Create(15, 30, 60).Value;

    private static Service NewService(ServiceModality? modality = null) =>
        Service.Create(Guid.NewGuid(), "Consulta", null, Duration, 150m, 0m, null, 1, modality ?? ServiceModality.InPersonOnly).Value;

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
    }

    [Theory]
    [InlineData(true, null)]
    [InlineData(null, false)]
    [InlineData(null, null)]
    public void Create_ComCampoAusente_PedeOsDois(bool? presencial, bool? online)
    {
        var result = ServiceModality.Create(presencial, online);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(ServiceModality.BothRequired);
    }

    [Fact]
    public void ServiceCreate_ComModalidade_GuardaAModalidade()
    {
        var service = NewService(ServiceModality.Create(attendsInPerson: false, attendsOnline: true).Value);

        service.Modality.AttendsInPerson.Should().BeFalse();
        service.Modality.AttendsOnline.Should().BeTrue();
    }

    [Fact]
    public void ServiceUpdate_ComModalidade_SubstituiAModalidade()
    {
        var service = NewService();

        var result = service.Update(
            "Consulta", null, Duration, 150m, 0m, null, ServiceModality.Create(attendsInPerson: false, attendsOnline: true).Value);

        result.IsSuccess.Should().BeTrue();
        service.Modality.AttendsInPerson.Should().BeFalse();
        service.Modality.AttendsOnline.Should().BeTrue();
    }

    [Fact]
    public void ServiceUpdate_RejeitadoPorOutroCampo_NaoAlteraAModalidade()
    {
        var service = NewService();

        var result = service.Update(
            "Consulta", null, Duration, -1m, 0m, null, ServiceModality.Create(attendsInPerson: false, attendsOnline: true).Value);

        result.IsFailure.Should().BeTrue();
        service.Modality.AttendsInPerson.Should().BeTrue();
        service.Modality.AttendsOnline.Should().BeFalse();
    }
}
