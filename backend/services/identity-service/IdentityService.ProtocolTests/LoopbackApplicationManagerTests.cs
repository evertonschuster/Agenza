using System.Collections.Immutable;
using System.Text.Json;
using IdentityService.Api.Setup;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using OpenIddict.Abstractions;
using OpenIddict.Core;

namespace IdentityService.ProtocolTests;

public sealed class LoopbackApplicationManagerTests
{
    private sealed class Fixture
    {
        public object Application { get; } = new();
        public IOpenIddictApplicationStore<object> Store { get; } = Substitute.For<IOpenIddictApplicationStore<object>>();
        public LoopbackApplicationManager<object> Manager { get; }

        public Fixture(bool enabled = true, string clientType = "public", string applicationType = "native", bool pkce = true)
        {
            Store.GetPropertiesAsync(Application, Arg.Any<CancellationToken>()).Returns(
                ValueTask.FromResult(enabled
                    ? ImmutableDictionary<string, JsonElement>.Empty.Add(
                        LoopbackApplicationManager<object>.AllowAnyLoopbackRedirectPath, JsonSerializer.SerializeToElement(true))
                    : ImmutableDictionary<string, JsonElement>.Empty));
            Store.GetClientTypeAsync(Application, Arg.Any<CancellationToken>()).Returns(ValueTask.FromResult<string?>(clientType));
            Store.GetApplicationTypeAsync(Application, Arg.Any<CancellationToken>()).Returns(ValueTask.FromResult<string?>(applicationType));
            Store.GetRequirementsAsync(Application, Arg.Any<CancellationToken>()).Returns(ValueTask.FromResult(pkce
                ? ImmutableArray.Create(OpenIddictConstants.Requirements.Features.ProofKeyForCodeExchange)
                : ImmutableArray<string>.Empty));
            Store.GetRedirectUrisAsync(Application, Arg.Any<CancellationToken>()).Returns(
                ValueTask.FromResult(ImmutableArray.Create("https://consumer.example/callback")));
            Manager = new(Substitute.For<IOpenIddictApplicationCache<object>>(),
                NullLogger<OpenIddictApplicationManager<object>>.Instance,
                Substitute.For<IOptionsMonitor<OpenIddictCoreOptions>>(), Store);
        }
    }

    [Theory]
    [InlineData("http://127.0.0.1:33418/")]
    [InlineData("http://127.0.0.1:49817/novo/callback")]
    [InlineData("http://127.0.0.1:65535/callback/aleatorio-123")]
    [InlineData("http://127.0.0.1/callback")]
    [InlineData("http://127.0.0.1:49817/caminho%3Fescapado")]
    public async Task Cliente_optante_aceita_caminho_e_porta_locais_variaveis(string callback)
    {
        var fixture = new Fixture();
        (await fixture.Manager.ValidateRedirectUriAsync(fixture.Application, callback, TestContext.Current.CancellationToken))
            .Should().BeTrue();
    }

    [Theory]
    [InlineData("http://localhost:49817/callback")]
    [InlineData("http://[::1]:49817/callback")]
    [InlineData("http://127.0.0.2:49817/callback")]
    [InlineData("http://127.1:49817/callback")]
    [InlineData("http://2130706433:49817/callback")]
    [InlineData("http://0x7f000001:49817/callback")]
    [InlineData("http://127.0.0.1.evil.invalid:49817/callback")]
    [InlineData("http://127.0.0.1@evil.invalid:49817/callback")]
    [InlineData("http://user@127.0.0.1:49817/callback")]
    [InlineData("http://127.0.0.1:49817/callback?next=x")]
    [InlineData("http://127.0.0.1:49817/callback#fragment")]
    [InlineData("http://127.0.0.1:0/callback")]
    [InlineData("http://127.0.0.1:65536/callback")]
    [InlineData("https://127.0.0.1:49817/callback")]
    [InlineData("http://192.168.1.1:49817/callback")]
    [InlineData("http://127.0.0.1:49817/with space")]
    public async Task Excecao_local_recusa_destinos_e_componentes_nao_permitidos(string callback)
    {
        var fixture = new Fixture();
        (await fixture.Manager.ValidateRedirectUriAsync(fixture.Application, callback, TestContext.Current.CancellationToken))
            .Should().BeFalse();
    }

    [Theory]
    [InlineData(false, "public", "native", true)]
    [InlineData(true, "confidential", "native", true)]
    [InlineData(true, "public", "web", true)]
    [InlineData(true, "public", "native", false)]
    public async Task Cliente_sem_opt_in_ou_perfil_compativel_mantem_validacao_padrao(
        bool enabled, string clientType, string applicationType, bool pkce)
    {
        var fixture = new Fixture(enabled, clientType, applicationType, pkce);
        (await fixture.Manager.ValidateRedirectUriAsync(fixture.Application,
            "http://127.0.0.1:49817/aleatorio", TestContext.Current.CancellationToken)).Should().BeFalse();
        (await fixture.Manager.ValidateRedirectUriAsync(fixture.Application,
            "https://consumer.example/callback", TestContext.Current.CancellationToken)).Should().BeTrue();
    }
    [Theory]
    [InlineData("false")]
    [InlineData("null")]
    [InlineData("\"true\"")]
    public async Task Propriedade_sem_booleano_verdadeiro_nao_habilita_excecao(string value)
    {
        var fixture = new Fixture();
        fixture.Store.GetPropertiesAsync(fixture.Application, Arg.Any<CancellationToken>()).Returns(
            ValueTask.FromResult(ImmutableDictionary<string, JsonElement>.Empty.Add(
                LoopbackApplicationManager<object>.AllowAnyLoopbackRedirectPath,
                JsonSerializer.Deserialize<JsonElement>(value))));
        (await fixture.Manager.ValidateRedirectUriAsync(fixture.Application,
            "http://127.0.0.1:49817/aleatorio", TestContext.Current.CancellationToken)).Should().BeFalse();
    }

}
