using IdentityService.Api.Seed;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OpenIddict.Server;

namespace IdentityService.ProtocolTests;

public sealed class OAuthMetadataTests
{
    [Fact]
    public void Servidor_publica_escopos_e_recurso_definidos_no_seeder()
    {
        var services = new ServiceCollection().AddOptions();
        DatabaseSeeder.ConfigureScopes(new OpenIddictServerBuilder(services));
        using var provider = services.BuildServiceProvider();

        var options = provider.GetRequiredService<IOptions<OpenIddictServerOptions>>().Value;

        options.Scopes.Should().Contain(
            ["openid", "profile", "email", "offline_access", "tenant_id", "services-api", "services-mcp", "identity-admin"]);
        options.Resources.Should().Contain(new Uri("https://localhost:7091/mcp"));
    }
}
