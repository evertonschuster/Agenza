using System.Collections.Immutable;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using OpenIddict.Abstractions;
using OpenIddict.Core;

namespace IdentityService.ProtocolTests;

public sealed class RedirectUriTests
{
    [Theory]
    [InlineData("http://127.0.0.1:33418/oauth/callback", true)]
    [InlineData("http://127.0.0.1:49817/oauth/callback", true)]
    [InlineData("http://127.0.0.1:49817/", true)]
    [InlineData("http://127.0.0.1:49817/callback/gxoOpNP_TF5R", false)]
    [InlineData("http://127.0.0.1:49817/oauth/callback/aleatorio", false)]
    [InlineData("http://127.0.0.1:49817/outro/callback", false)]
    [InlineData("https://attacker.invalid/oauth/callback", false)]
    public async Task Callback_nativo_aceita_porta_variavel_apenas_com_caminho_cadastrado(string uri, bool expected)
    {
        var application = new object();
        var store = Substitute.For<IOpenIddictApplicationStore<object>>();
        store.GetApplicationTypeAsync(application, Arg.Any<CancellationToken>())
            .Returns(ValueTask.FromResult<string?>(OpenIddictConstants.ApplicationTypes.Native));
        store.GetRedirectUrisAsync(application, Arg.Any<CancellationToken>())
            .Returns(ValueTask.FromResult(ImmutableArray.Create(
                "http://127.0.0.1/oauth/callback", "http://127.0.0.1/")));
        var options = Substitute.For<IOptionsMonitor<OpenIddictCoreOptions>>();
        options.CurrentValue.Returns(new OpenIddictCoreOptions());
        var manager = new OpenIddictApplicationManager<object>(
            Substitute.For<IOpenIddictApplicationCache<object>>(),
            NullLogger<OpenIddictApplicationManager<object>>.Instance, options, store);

        var accepted = await manager.ValidateRedirectUriAsync(application, uri, TestContext.Current.CancellationToken);

        accepted.Should().Be(expected);
    }
}
