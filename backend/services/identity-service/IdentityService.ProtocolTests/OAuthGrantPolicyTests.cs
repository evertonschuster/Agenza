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
        public List<string> AllowedScopes { get; } = ["openid", "offline_access", "read", "write"];
        public List<string> AllowedResources { get; } = ["https://first.example/api", "https://second.example/api"];
        public List<string> MappedResources { get; } = ["https://first.example/api", "https://second.example/api"];
        public bool Enabled { get; set; } = true;

        public Fixture()
        {
            Applications.FindByClientIdAsync("client", Arg.Any<CancellationToken>())
                .Returns(ValueTask.FromResult<object?>(Application));
            Applications.GetConsentTypeAsync(Application, Arg.Any<CancellationToken>())
                .Returns(ValueTask.FromResult<string?>(OpenIddictConstants.ConsentTypes.Implicit));
            Applications.GetPermissionsAsync(Application, Arg.Any<CancellationToken>()).Returns(_ =>
                ValueTask.FromResult(Enabled
                    ? AllowedScopes.Select(scope => OpenIddictConstants.Permissions.Prefixes.Scope + scope)
                        .Concat(AllowedResources.Select(resource => OpenIddictConstants.Permissions.Prefixes.Resource + resource))
                        .Append(OpenIddictConstants.Permissions.Endpoints.Token).ToImmutableArray()
                    : ImmutableArray<string>.Empty));
            Scopes.ListResourcesAsync(Arg.Any<ImmutableArray<string>>(), Arg.Any<CancellationToken>())
                .Returns(_ => Resources(MappedResources));
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
        var result = await fixture.Policy.ResolveAsync("client", ["read"], ["https://second.example/api"], null, true, TestContext.Current.CancellationToken);

        result.IsSuccess.Should().BeTrue();
        result.Value.Scopes.Should().Equal("read");
        result.Value.Resources.Should().Equal("https://second.example/api");
    }

    [Fact]
    public async Task Audiencia_nao_autorizada_ao_cliente_e_recusada_mesmo_quando_esta_no_escopo()
    {
        var fixture = new Fixture();
        fixture.AllowedResources.Remove("https://second.example/api");

        var result = await fixture.Policy.ResolveAsync("client", ["read"], ["https://second.example/api"], null, true, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(OpenIddictConstants.Errors.InvalidTarget);
    }

    [Theory]
    [InlineData("unknown")]
    [InlineData("READ")]
    public async Task Escopo_fora_das_permissoes_do_cliente_e_recusado(string scope)
    {
        var fixture = new Fixture();
        var result = await fixture.Policy.ResolveAsync("client", [scope], [], null, true, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(OpenIddictConstants.Errors.InvalidScope);
    }

    [Fact]
    public async Task Cliente_desconhecido_nao_recebe_concessao()
    {
        var fixture = new Fixture();
        var result = await fixture.Policy.ResolveAsync("unknown", ["read"], [], null, true, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(OpenIddictConstants.Errors.InvalidClient);
    }

    [Fact]
    public async Task Cliente_desativado_perde_autorizacao_e_renovacao_sem_cache_de_configuracao()
    {
        var fixture = new Fixture();
        (await fixture.Policy.ResolveAsync("client", ["read"], [], null, true, TestContext.Current.CancellationToken)).IsSuccess.Should().BeTrue();
        fixture.Enabled = false;

        var result = await fixture.Policy.ResolveAsync("client", [], [],
            Previous(["read"], ["https://first.example/api"]), true, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(OpenIddictConstants.Errors.UnauthorizedClient);
    }

    [Fact]
    public async Task Consentimento_automatico_precisa_estar_aprovado_no_cadastro_do_cliente()
    {
        var fixture = new Fixture();
        fixture.Applications.GetConsentTypeAsync(fixture.Application, Arg.Any<CancellationToken>())
            .Returns(ValueTask.FromResult<string?>(OpenIddictConstants.ConsentTypes.Explicit));

        var result = await fixture.Policy.ResolveAsync("client", ["read"], [], null, true, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(OpenIddictConstants.Errors.ConsentRequired);
    }

    [Fact]
    public async Task Servico_m2m_nao_depende_de_consentimento_de_usuario()
    {
        var fixture = new Fixture();
        fixture.Applications.GetConsentTypeAsync(fixture.Application, Arg.Any<CancellationToken>())
            .Returns(ValueTask.FromResult<string?>(OpenIddictConstants.ConsentTypes.Explicit));

        var result = await fixture.Policy.ResolveAsync("client", ["read"], [], null, false, TestContext.Current.CancellationToken);

        result.IsSuccess.Should().BeTrue();
    }

    [Fact]
    public async Task Renovacao_remove_escopo_revogado_e_nao_acrescenta_permissoes_novas()
    {
        var fixture = new Fixture();
        fixture.AllowedScopes.Remove("write");
        fixture.AllowedScopes.Add("new-permission");

        var result = await fixture.Policy.ResolveAsync("client", [], [],
            Previous(["openid", "read", "write"], ["https://first.example/api"]), true, TestContext.Current.CancellationToken);

        result.IsSuccess.Should().BeTrue();
        result.Value.Scopes.Should().BeEquivalentTo("openid", "read");
        result.Value.Resources.Should().Equal("https://first.example/api");
    }

    [Fact]
    public async Task Renovacao_nao_pode_solicitar_escopo_fora_da_concessao_original()
    {
        var fixture = new Fixture();
        var result = await fixture.Policy.ResolveAsync("client", ["write"], [],
            Previous(["read"], ["https://first.example/api"]), true, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(OpenIddictConstants.Errors.InvalidScope);
    }

    [Fact]
    public async Task Renovacao_respeita_reducao_de_escopos_solicitada_pelo_cliente()
    {
        var fixture = new Fixture();
        var result = await fixture.Policy.ResolveAsync("client", ["read"], [],
            Previous(["read", "write"], ["https://first.example/api"]), true, TestContext.Current.CancellationToken);

        result.IsSuccess.Should().BeTrue();
        result.Value.Scopes.Should().Equal("read");
    }

    [Fact]
    public async Task Alterar_mapeamento_de_escopo_nao_acrescenta_audiencia_a_grant_existente()
    {
        var fixture = new Fixture();
        var result = await fixture.Policy.ResolveAsync("client", [], ["https://second.example/api"],
            Previous(["read"], ["https://first.example/api"]), true, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(OpenIddictConstants.Errors.InvalidTarget);
    }

    [Fact]
    public async Task Retirar_recurso_da_politica_invalida_renovacao_sem_destino_autorizado()
    {
        var fixture = new Fixture();
        fixture.AllowedResources.Remove("https://first.example/api");

        var result = await fixture.Policy.ResolveAsync("client", [], [],
            Previous(["read"], ["https://first.example/api"]), true, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be(OpenIddictConstants.Errors.InvalidGrant);
    }

    [Fact]
    public async Task Escopos_especiais_tambem_respeitam_a_politica_local()
    {
        var fixture = new Fixture();
        fixture.AllowedScopes.Remove("offline_access");

        var result = await fixture.Policy.ResolveAsync("client", ["offline_access"], [], null, true, TestContext.Current.CancellationToken);

        result.IsFailure.Should().BeTrue();
    }
}
