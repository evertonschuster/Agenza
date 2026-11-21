using IdentityService.Api.Seed;
using Microsoft.Extensions.Configuration;
using OpenIddict.Abstractions;

namespace IdentityService.ProtocolTests;

public sealed class TenantProvisioningClientTests
{
    private const string ClientId = "tenant-provisioning-cli";

    private static IConfiguration Configuration(string? secret)
    {
        var values = new Dictionary<string, string?> { ["IdentityClients:TenantProvisioning:Secret"] = secret };
        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Sem_segredo_configurado_o_cliente_de_provisionamento_nao_e_registrado(string? secret)
    {
        DatabaseSeeder.ClientDefinitions(Configuration(secret)).Should().NotContain(client => client.ClientId == ClientId);
    }

    [Fact]
    public void Com_segredo_o_cliente_e_confidencial_e_so_usa_client_credentials_com_o_escopo_administrativo()
    {
        var client = DatabaseSeeder.ClientDefinitions(Configuration("segredo")).Single(client => client.ClientId == ClientId);

        client.ClientType.Should().Be(OpenIddictConstants.ClientTypes.Confidential);
        client.ClientSecret.Should().Be("segredo");
        client.Permissions.Should().BeEquivalentTo(
        [
            OpenIddictConstants.Permissions.Endpoints.Token,
            OpenIddictConstants.Permissions.GrantTypes.ClientCredentials,
            OpenIddictConstants.Permissions.Prefixes.Scope + "identity-admin",
            OpenIddictConstants.Permissions.Prefixes.Resource + "identity-service",
        ]);
        client.RedirectUris.Should().BeEmpty();
    }

    [Fact]
    public void Clientes_interativos_nao_recebem_o_escopo_administrativo()
    {
        var interactive = DatabaseSeeder.ClientDefinitions(Configuration("segredo"))
            .Where(client => client.ClientType == OpenIddictConstants.ClientTypes.Public);

        interactive.Should().NotBeEmpty().And.AllSatisfy(client =>
            client.Permissions.Should().NotContain(OpenIddictConstants.Permissions.Prefixes.Scope + "identity-admin"));
    }
}
