using System.Text.Json;
using ServicesService.Application.Clients.UpdateClient;

namespace ServicesService.Tests.Clients.UpdateClient;

public class UpdateClientCommandBindingTests
{
    private static readonly JsonSerializerOptions WebOptions = new(JsonSerializerDefaults.Web);

    [Fact]
    public void Deserialize_IgnoresATenantAndASituationSentInTheBody()
    {
        const string json = """
            {
              "tenantId": "11111111-1111-1111-1111-111111111111",
              "status": "inactive",
              "fullName": "Maria Souza",
              "guardians": [
                { "tenantId": "22222222-2222-2222-2222-222222222222", "clientId": "33333333-3333-3333-3333-333333333333", "name": "Ana Souza", "relationship": "Mãe" }
              ]
            }
            """;

        var command = JsonSerializer.Deserialize<UpdateClientCommand>(json, WebOptions);

        command.Should().NotBeNull();
        command!.FullName.Should().Be("Maria Souza");
        command.Guardians.Should().ContainSingle().Which.Name.Should().Be("Ana Souza");
        typeof(UpdateClientCommand).GetProperties().Select(property => property.Name)
            .Should().NotContain(name => name.Contains("Tenant") || name.Contains("Status"));
        typeof(UpdateGuardianInput).GetProperties().Select(property => property.Name)
            .Should().NotContain(name => name.Contains("Tenant") || name.Contains("Client"));
        typeof(UpdateReferenceContactInput).GetProperties().Select(property => property.Name)
            .Should().NotContain(name => name.Contains("Tenant") || name.Contains("Client"));
    }

    [Fact]
    public void Deserialize_ReadsTheWireContractWithExistingAndNewContacts()
    {
        const string json = """
            {
              "fullName": "Maria Souza",
              "birthDate": "2015-03-10",
              "phone": "(11) 99999-0000",
              "email": "maria@example.com",
              "cpf": "529.982.247-25",
              "administrativeNotes": "Prefere contato pela manhã.",
              "guardians": [
                { "id": "44444444-4444-4444-4444-444444444444", "name": "Ana Souza", "relationship": "Mãe", "phone": null, "cpf": null },
                { "name": "Bia Souza", "relationship": "Tia" }
              ],
              "referenceContacts": [
                { "id": "55555555-5555-5555-5555-555555555555", "name": "Carlos Lima", "relationship": "Tio", "phone": null, "purposes": ["emergency", "dailyCommunication"] }
              ]
            }
            """;

        var command = JsonSerializer.Deserialize<UpdateClientCommand>(json, WebOptions)!;

        command.BirthDate.Should().Be(new DateOnly(2015, 3, 10));
        command.Guardians!.Select(guardian => guardian.Id).Should()
            .Equal(Guid.Parse("44444444-4444-4444-4444-444444444444"), null);
        command.ReferenceContacts.Should().ContainSingle().Which.Id
            .Should().Be(Guid.Parse("55555555-5555-5555-5555-555555555555"));
        command.ReferenceContacts![0].Purposes.Should().Equal("emergency", "dailyCommunication");
    }

    [Fact]
    public void Deserialize_WithoutOptionalFields_LeavesThemNull()
    {
        var command = JsonSerializer.Deserialize<UpdateClientCommand>("""{ "fullName": "Maria Souza" }""", WebOptions)!;

        command.BirthDate.Should().BeNull();
        command.Guardians.Should().BeNull();
        command.ReferenceContacts.Should().BeNull();
    }
}
