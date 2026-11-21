using IdentityService.Api.Setup;
using Microsoft.Extensions.Configuration;
using OpenIddict.Abstractions;

namespace IdentityService.ProtocolTests;

public sealed class OAuthProvisioningTests
{
    private static readonly IConfiguration Configuration = new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?> { ["Secrets:worker"] = "a-test-secret" }).Build();

    private static OAuthProvisioningOptions Definitions()
    {
        return new OAuthProvisioningOptions
        {
            Scopes = [new() { Name = "read", Resources = ["https://first.example/api"] },
                new() { Name = "other", Resources = ["https://second.example/api"] }],
            Clients = [new()
            {
                ClientId = "web", ClientType = "public", ConsentType = "implicit",
                GrantTypes = ["authorization_code", "refresh_token"],
                Scopes = ["read"], Resources = ["https://first.example/api"],
                RedirectUris = ["https://consumer.example/callback"],
            }],
        };
    }

    [Fact]
    public void Clientes_distintos_recebem_apenas_suas_permissoes_por_configuracao()
    {
        var definitions = Definitions();
        definitions.Clients.Add(new OAuthClientDefinition
        {
            ClientId = "other",
            ClientType = "public",
            ConsentType = "implicit",
            GrantTypes = ["authorization_code"],
            Scopes = ["other"],
            Resources = ["https://second.example/api"],
            RedirectUris = ["https://other.example/callback"],
        });
        definitions.Validate(Configuration).Should().BeEmpty();

        var first = definitions.Clients[0].ToDescriptor(Configuration);
        var second = definitions.Clients[1].ToDescriptor(Configuration);

        first.Permissions.Should().Contain(OpenIddictConstants.Permissions.Prefixes.Scope + "read")
            .And.NotContain(OpenIddictConstants.Permissions.Prefixes.Scope + "other");
        second.Permissions.Should().Contain(OpenIddictConstants.Permissions.Prefixes.Scope + "other")
            .And.NotContain(OpenIddictConstants.Permissions.Prefixes.Scope + "read");
        second.Permissions.Should().NotContain(OpenIddictConstants.Permissions.GrantTypes.RefreshToken);
        first.Requirements.Should().Contain(OpenIddictConstants.Requirements.Features.ProofKeyForCodeExchange);
    }

    [Theory]
    [InlineData("unknown-scope")]
    [InlineData("unmapped-resource")]
    [InlineData("duplicate-client")]
    [InlineData("missing-consent")]
    [InlineData("missing-callback")]
    [InlineData("invalid-callback")]
    [InlineData("public-machine-client")]
    [InlineData("missing-secret")]
    public void Configuracao_inconsistente_e_recusada_antes_do_provisionamento(string change)
    {
        var definitions = Definitions();
        var client = definitions.Clients[0];
        switch (change)
        {
            case "unknown-scope": client.Scopes.Add("missing"); break;
            case "unmapped-resource": client.Resources.Add("https://second.example/api"); break;
            case "duplicate-client": definitions.Clients.Add(client); break;
            case "missing-consent": client.ConsentType = ""; break;
            case "missing-callback": client.RedirectUris.Clear(); break;
            case "invalid-callback": client.RedirectUris = ["http://attacker.example/callback"]; break;
            case "public-machine-client": client.GrantTypes = ["client_credentials"]; break;
            case "missing-secret":
                client.ClientType = "confidential";
                client.GrantTypes = ["client_credentials"];
                client.RedirectUris.Clear();
                client.SecretConfigurationKey = "missing";
                break;
        }

        definitions.Validate(Configuration).Should().NotBeEmpty();
    }

    [Fact]
    public void Acesso_offline_exige_permissao_explicita_de_renovacao()
    {
        var definitions = Definitions();
        definitions.Scopes.Add(new OAuthScopeDefinition { Name = "offline_access" });
        definitions.Clients[0].Scopes.Add("offline_access");
        definitions.Clients[0].GrantTypes.Remove("refresh_token");

        definitions.Validate(Configuration).Should().NotBeEmpty();
    }

    [Fact]
    public void Cadastro_desativado_remove_permissoes_de_endpoints_e_grants()
    {
        var client = Definitions().Clients[0];
        client.Enabled = false;

        client.ToDescriptor(Configuration).Permissions.Should().BeEmpty();
    }

    [Fact]
    public void Cliente_m2m_usa_segredo_e_nao_ganha_autorizacao_interativa()
    {
        var client = new OAuthClientDefinition
        {
            ClientId = "worker",
            ClientType = "confidential",
            SecretConfigurationKey = "Secrets:worker",
            GrantTypes = ["client_credentials"],
            Scopes = ["read"],
            Resources = ["https://first.example/api"],
        };
        var definitions = Definitions();
        definitions.Clients = [client];
        definitions.Validate(Configuration).Should().BeEmpty();

        var descriptor = client.ToDescriptor(Configuration);

        descriptor.ClientSecret.Should().Be("a-test-secret");
        descriptor.Permissions.Should().Contain(OpenIddictConstants.Permissions.GrantTypes.ClientCredentials)
            .And.NotContain(OpenIddictConstants.Permissions.Endpoints.Authorization)
            .And.NotContain(OpenIddictConstants.Permissions.GrantTypes.RefreshToken);
    }

    [Fact]
    public void Callback_nativo_mantem_loopback_e_exige_pkce()
    {
        var definitions = Definitions();
        definitions.Clients[0].ApplicationType = "native";
        definitions.Clients[0].RedirectUris = ["http://127.0.0.1/callback"];

        definitions.Validate(Configuration).Should().BeEmpty();
        definitions.Clients[0].ToDescriptor(Configuration).Requirements
            .Should().Contain(OpenIddictConstants.Requirements.Features.ProofKeyForCodeExchange);
    }
}
