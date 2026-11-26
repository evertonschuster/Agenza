using System.Text.Json;
using ServicesService.Application.Services;
using ServicesService.Application.Services.CreateService;
using ServicesService.Application.Services.UpdateService;

namespace ServicesService.Tests.Services;

public class ServiceModalityBindingTests
{
    private static CreateServiceCommand BindCreate(string modalityJson) =>
        JsonSerializer.Deserialize<CreateServiceCommand>($$"""{ "name": "Terapia", "modality": {{modalityJson}} }""", WireJson.Options)!;

    private static UpdateServiceCommand BindUpdate(string modalityJson) =>
        JsonSerializer.Deserialize<UpdateServiceCommand>($$"""{ "name": "Terapia", "modality": {{modalityJson}} }""", WireJson.Options)!;

    [Theory]
    [InlineData("""{ "attendsInPerson": true, "attendsOnline": false }""", true, false)]
    [InlineData("""{ "attendsInPerson": false, "attendsOnline": true }""", false, true)]
    [InlineData("""{ "attendsInPerson": true, "attendsOnline": true }""", true, true)]
    public void Read_ComModalidadeValida_ChegaComoObjetoDeValor(string modalityJson, bool presencial, bool online)
    {
        var modality = BindCreate(modalityJson).Modality!;

        modality.AttendsInPerson.Should().Be(presencial);
        modality.AttendsOnline.Should().Be(online);
        BindUpdate(modalityJson).Modality.Should().Be(modality);
    }

    [Fact]
    public void Read_SemModalidade_ChegaComoNulo()
    {
        var create = JsonSerializer.Deserialize<CreateServiceCommand>("""{ "name": "Terapia" }""", WireJson.Options)!;
        var update = JsonSerializer.Deserialize<UpdateServiceCommand>("""{ "name": "Terapia" }""", WireJson.Options)!;

        create.Modality.Should().BeNull();
        update.Modality.Should().BeNull();
    }

    [Fact]
    public void Read_ComModalidadeNula_ChegaComoNulo()
    {
        BindCreate("null").Modality.Should().BeNull();
    }

    [Fact]
    public void Read_ComOsDoisFormatosFalsos_FalhaNoCampoComAMensagemEmPortugues()
    {
        var act = () => BindCreate("""{ "attendsInPerson": false, "attendsOnline": false }""");

        var exception = act.Should().Throw<JsonException>().Which;
        exception.Path.Should().Be("$.modality");
        exception.Message.Should().Be(ServiceModality.Required.Message);
    }

    [Theory]
    [InlineData("""{ "attendsInPerson": true }""")]
    [InlineData("""{ "attendsOnline": false }""")]
    [InlineData("{}")]
    public void Read_ComSoUmDosFormatos_FalhaPedindoOsDois(string modalityJson)
    {
        var act = () => BindCreate(modalityJson);

        act.Should().Throw<JsonException>().Which.Message
            .Should().Be("Informe se o serviço atende presencialmente e se atende online.");
    }

    [Theory]
    [InlineData("\"presencial\"")]
    [InlineData("""{ "attendsInPerson": "sim", "attendsOnline": true }""")]
    public void Read_ComTipoErrado_Falha(string modalityJson)
    {
        var act = () => BindCreate(modalityJson);

        act.Should().Throw<JsonException>();
    }

    [Fact]
    public void Write_DevolveAModalidadeComoObjeto()
    {
        var service = Service.Create(
            Guid.NewGuid(), "Terapia", null, DurationRange.Create(15, 30, 60).Value, 150m, 0m, null, 1,
            ServiceModality.Create(attendsInPerson: false, attendsOnline: true).Value).Value;

        var json = JsonSerializer.Serialize(ServiceResponse.FromService(service, null), WireJson.Options);

        using var document = JsonDocument.Parse(json);
        var modality = document.RootElement.GetProperty("modality");
        modality.GetProperty("attendsInPerson").GetBoolean().Should().BeFalse();
        modality.GetProperty("attendsOnline").GetBoolean().Should().BeTrue();
    }
}
