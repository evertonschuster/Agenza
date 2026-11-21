using Microsoft.Extensions.Logging.Abstractions;
using OpenIddict.Abstractions;
using OpenIddict.Server;

namespace IdentityService.ProtocolTests;

public sealed class OpenIddictPermissionTests
{
    private static OpenIddictServerEvents.ValidateTokenRequestContext Context(string scope)
    {
        return new(new OpenIddictServerTransaction
        {
            Logger = NullLogger.Instance,
            Options = new OpenIddictServerOptions(),
            Request = new OpenIddictRequest
            {
                ClientId = "client",
                GrantType = OpenIddictConstants.GrantTypes.RefreshToken,
                Scope = scope,
            },
        });
    }

    private static IOpenIddictApplicationManager Applications()
    {
        var applications = Substitute.For<IOpenIddictApplicationManager>();
        applications.FindByClientIdAsync("client", Arg.Any<CancellationToken>())
            .Returns(ValueTask.FromResult<object?>(new object()));
        return applications;
    }

    [Fact]
    public async Task OpenIddict_recusa_cliente_sem_permissao_do_endpoint_de_token()
    {
        var context = Context("read");
        await new OpenIddictServerHandlers.Exchange.ValidateEndpointPermissions(Applications()).HandleAsync(context);

        context.IsRejected.Should().BeTrue();
        context.Error.Should().Be(OpenIddictConstants.Errors.UnauthorizedClient);
    }

    [Fact]
    public async Task OpenIddict_recusa_cliente_sem_permissao_do_grant()
    {
        var context = Context("read");
        await new OpenIddictServerHandlers.Exchange.ValidateGrantTypePermissions(Applications()).HandleAsync(context);

        context.IsRejected.Should().BeTrue();
        context.Error.Should().Be(OpenIddictConstants.Errors.UnauthorizedClient);
    }

    [Fact]
    public async Task OpenIddict_recusa_escopo_de_negocio_sem_permissao()
    {
        var context = Context("read");
        await new OpenIddictServerHandlers.Exchange.ValidateScopePermissions(Applications()).HandleAsync(context);

        context.IsRejected.Should().BeTrue();
        context.Error.Should().Be(OpenIddictConstants.Errors.InvalidRequest);
    }

    [Theory]
    [InlineData("openid")]
    [InlineData("offline_access")]
    public async Task OpenIddict_nao_exige_permissao_de_escopo_para_escopos_de_protocolo(string scope)
    {
        var context = Context(scope);
        await new OpenIddictServerHandlers.Exchange.ValidateScopePermissions(Applications()).HandleAsync(context);

        context.IsRejected.Should().BeFalse();
    }
}
