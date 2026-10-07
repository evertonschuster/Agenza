using System.Text.Json;
using ServicesService.Application.Clients.CreateClient;

namespace ServicesService.Tests.Clients.CreateClient;

public class CreateClientCommandBindingTests
{
    [Fact]
    public void Deserialize_IgnoresATenantSentInTheBody()
    {
        const string json = """
            {
              "tenantId": "11111111-1111-1111-1111-111111111111",
              "fullName": "Maria Souza",
              "guardians": [
                { "tenantId": "22222222-2222-2222-2222-222222222222", "name": "Ana Souza", "relationship": "Mãe" }
              ]
            }
            """;

        var command = JsonSerializer.Deserialize<CreateClientCommand>(json, WireJson.Options);

        command.Should().NotBeNull();
        command!.FullName.Value.Should().Be("Maria Souza");
        command.Guardians.Should().ContainSingle().Which.Name.Should().Be("Ana Souza");
        typeof(CreateClientCommand).GetProperties().Select(property => property.Name)
            .Should().NotContain(name => name.Contains("Tenant"));
        typeof(GuardianInput).GetProperties().Select(property => property.Name)
            .Should().NotContain(name => name.Contains("Tenant"));
    }

    [Fact]
    public void Deserialize_ReadsTheWireContract()
    {
        const string json = """
            {
              "fullName": "Maria Souza",
              "birthDate": "2015-03-10",
              "phone": "(11) 99999-0000",
              "email": "maria@example.com",
              "cpf": "529.982.247-25",
              "administrativeNotes": "Prefere contato pela manhã.",
              "guardians": [{ "name": "Ana Souza", "relationship": "Mãe", "phone": null, "cpf": null }],
              "referenceContacts": [
                { "name": "Carlos Lima", "relationship": "Tio", "phone": null, "purposes": ["emergency", "dailyCommunication"] }
              ]
            }
            """;

        var command = JsonSerializer.Deserialize<CreateClientCommand>(json, WireJson.Options)!;

        command.BirthDate!.Value.Should().Be(new DateOnly(2015, 3, 10));
        command.Cpf!.Value.Should().Be(ClientTestData.ValidCpfDigits);
        command.AdministrativeNotes!.Value.Should().Be("Prefere contato pela manhã.");
        command.ReferenceContacts.Should().ContainSingle()
            .Which.Purposes.Should().Equal(ContactPurpose.Emergency, ContactPurpose.DailyCommunication);
    }

    [Fact]
    public void Deserialize_WithoutOptionalFields_LeavesThemNull()
    {
        var command = JsonSerializer.Deserialize<CreateClientCommand>("""{ "fullName": "Maria Souza" }""", WireJson.Options)!;

        command.BirthDate.Should().BeNull();
        command.Cpf.Should().BeNull();
        command.Guardians.Should().BeNull();
        command.ReferenceContacts.Should().BeNull();
    }
}
