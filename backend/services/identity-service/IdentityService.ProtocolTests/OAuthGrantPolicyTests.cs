using System.Collections.Immutable;
using System.Security.Claims;
using IdentityService.Api.Setup;
using OpenIddict.Abstractions;

namespace IdentityService.ProtocolTests;

public sealed class OAuthGrantPolicyTests
{
    private sealed class Fixture
    {
        public object Application { get; } = new();
        public IOpenIddictApplicationManager Applications { get; } = Substitute.For<IOpenIddictApplicationManager>();
        public IOpenIddictScopeManager Scopes { get; } = Substitute.For<IOpenIddictScopeManager>();
        public OAuthGrantPolicy Policy { get; }
        public List<string> AllowedScopes { get; } = ["read", "write"];
        public List<string> AllowedResources { get; } = ["https://first.example/api", "https://second.example/api"];
        public List<string> MappedResources { get; } = ["https://first.example/api", "https://second.example/api"];

        public Fixture()
        {
            Applications.FindByClientIdAsync("client", Arg.Any<CancellationToken>())
                .Returns(ValueTask.FromResult<object?>(Application));
            Applications.GetPermissionsAsync(Application, Arg.Any<CancellationToken>()).Returns(_ =>
                ValueTask.FromResult(AllowedScopes.Select(scope => OpenIddictConstants.Permissions.Prefixes.Scope + scope)
                        .Concat(AllowedResources.Select(resource => OpenIddictConstants.Permissions.Prefixes.Resource + resource))
                        .Append(OpenIddictConstants.Permissions.Endpoints.Token).ToImmutableArray()));
            Scopes.ListResourcesAsync(Arg.Any<ImmutableArray<string>>(), Arg.Any<CancellationToken>())
                .Returns(call => Resources(call.ArgAt<ImmutableArray<string>>(0).SelectMany<string, string>(scope =>
                    scope == "read" ? MappedResources : scope == "write" ? ["https://second.example/api"] : Array.Empty<string>()).Distinct()));
            Policy = new OAuthGrantPolicy(Applications, Scopes);
        }

        private static async IAsyncEnumerable<string> Resources(IEnumerable<string> resources)
        {
            await Task.CompletedTask;
            foreach (var resource in resources)
            {
                yield return resource;
            }
        }
    }

    private static ClaimsPrincipal Previous(string[] scopes, string[] resources)
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity("test"));
        principal.SetScopes(scopes);
        principal.SetResources(resources);
        return principal;
    }

    [Fact]
    public async Task Segundo_recurso_configurado_utiliza_a_mesma_politica_sem_conhecimento_do_consumidor()
    {
        var fixture = new Fixture();
        var result = await fixture.Policy.ResolveAsync("client", ["read"], ["https://second.example/api"], null, TestContext.Current.CancellationToken);

        result.IsSuccess.Should().BeTrue();
        result.Value.Scopes.Should().Equal("read");
        result.Value.Resources.Should().Equal("https://second.example/api");
    }

    [Fact]
    public async Task Audiencia_nao_autorizada_ao_cliente_e_recusada_mesmo_quando_esta_no_escopo()
    {
        var fixture = new Fixture();
        fixture.AllowedResources.Remove("https://second.example/api");

        var result = await fixture.Policy.ResolveAsync("client", ["read"], ["https://second.example/api"], null, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(OpenIddictConstants.Errors.InvalidTarget);
    }

    [Fact]
    public async Task Renovacao_remove_escopo_revogado_e_nao_acrescenta_permissoes_novas()
    {
        var fixture = new Fixture();
        fixture.AllowedScopes.Remove("write");
        fixture.AllowedScopes.Add("new-permission");

        var result = await fixture.Policy.ResolveAsync("client", [], [],
            Previous(["openid", "read", "write"], ["https://first.example/api"]), TestContext.Current.CancellationToken);

        result.IsSuccess.Should().BeTrue();
        result.Value.Scopes.Should().BeEquivalentTo("openid", "read");
        result.Value.Resources.Should().Equal("https://first.example/api");
    }

    [Fact]
    public async Task Renovacao_respeita_reducao_de_escopos_solicitada_pelo_cliente()
    {
        var fixture = new Fixture();
        var result = await fixture.Policy.ResolveAsync("client", ["read"], [],
            Previous(["read", "write"], ["https://first.example/api"]), TestContext.Current.CancellationToken);

        result.IsSuccess.Should().BeTrue();
        result.Value.Scopes.Should().Equal("read");
    }

    [Fact]
    public async Task Alterar_mapeamento_de_escopo_nao_acrescenta_audiencia_a_grant_existente()
    {
        var fixture = new Fixture();
        var result = await fixture.Policy.ResolveAsync("client", [], ["https://second.example/api"],
            Previous(["read"], ["https://first.example/api"]), TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(OpenIddictConstants.Errors.InvalidTarget);
    }

    [Fact]
    public async Task Retirar_recurso_da_politica_invalida_renovacao_sem_destino_autorizado()
    {
        var fixture = new Fixture();
        fixture.AllowedResources.Remove("https://first.example/api");

        var result = await fixture.Policy.ResolveAsync("client", [], [],
            Previous(["read"], ["https://first.example/api"]), TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(OpenIddictConstants.Errors.InvalidGrant);
    }

    [Fact]
    public async Task Escopos_de_protocolo_validados_pelo_OpenIddict_nao_exigem_permissao_local()
    {
        var fixture = new Fixture();
        var result = await fixture.Policy.ResolveAsync("client", ["openid", "offline_access", "read"], [],
            null, TestContext.Current.CancellationToken);

        result.IsSuccess.Should().BeTrue();
        result.Value.Scopes.Should().BeEquivalentTo("openid", "offline_access", "read");
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Renovacao_preserva_escopos_de_protocolo_sem_permissoes_explicitas(bool explicitScopes)
    {
        var fixture = new Fixture();
        string[] scopes = ["openid", "offline_access", "read"];
        var result = await fixture.Policy.ResolveAsync("client", explicitScopes ? scopes : [], [],
            Previous(scopes, ["https://first.example/api"]), TestContext.Current.CancellationToken);

        result.IsSuccess.Should().BeTrue();
        result.Value.Scopes.Should().BeEquivalentTo(scopes);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Renovacao_remove_audiencia_do_escopo_revogado(bool explicitScopes)
    {
        var fixture = new Fixture();
        fixture.MappedResources.Remove("https://second.example/api");
        fixture.AllowedScopes.Remove("write");
        var result = await fixture.Policy.ResolveAsync("client", explicitScopes ? ["read"] : [], [],
            Previous(["read", "write"], ["https://first.example/api", "https://second.example/api"]),
            TestContext.Current.CancellationToken);

        result.IsSuccess.Should().BeTrue();
        result.Value.Scopes.Should().Equal("read");
        result.Value.Resources.Should().Equal("https://first.example/api");
    }
}
