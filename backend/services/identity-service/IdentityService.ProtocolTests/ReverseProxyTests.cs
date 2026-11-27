using System.Net;
using IdentityService.Api.Setup;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace IdentityService.ProtocolTests;

public sealed class ReverseProxyTests
{
    [Theory]
    [InlineData("127.0.0.1")]
    [InlineData("::1")]
    [InlineData("::ffff:127.0.0.1")]
    public async Task Reconhece_https_e_ip_do_visitante_encaminhados_pelo_proxy_local(string proxy)
    {
        var context = await Forward(proxy, "203.0.113.7", "https");

        context.Request.Scheme.Should().Be("https");
        context.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse("203.0.113.7"));
        context.Request.Host.Value.Should().Be("identityagenza.itactic.com.br");
        context.Request.PathBase.Value.Should().BeEmpty();
    }

    [Theory]
    [InlineData("203.0.113.8")]
    [InlineData("10.0.0.1")]
    [InlineData("127.0.0.2")]
    public async Task Ignora_cabecalhos_de_origens_que_nao_sejam_o_proxy_local(string remote)
    {
        var context = await Forward(remote, "203.0.113.7", "https");

        context.Request.Scheme.Should().Be("http");
        context.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse(remote));
    }

    [Fact]
    public async Task Processa_somente_o_ultimo_salto_da_cadeia_encaminhada()
    {
        var context = await Forward("127.0.0.1", "198.51.100.2, 203.0.113.7", "http, https");

        context.Request.Scheme.Should().Be("https");
        context.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse("203.0.113.7"));
        context.Request.Headers["X-Forwarded-For"].ToString().Should().Be("198.51.100.2");
        context.Request.Headers["X-Forwarded-Proto"].ToString().Should().Be("http");
    }

    private static async Task<DefaultHttpContext> Forward(string remote, string forwardedFor, string forwardedProto)
    {
        var services = new ServiceCollection();
        services.AddIdentityReverseProxy();
        using var provider = services.BuildServiceProvider();
        var options = provider.GetRequiredService<IOptions<ForwardedHeadersOptions>>();
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(remote);
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("identityagenza.itactic.com.br");
        context.Request.Headers["X-Forwarded-For"] = forwardedFor;
        context.Request.Headers["X-Forwarded-Proto"] = forwardedProto;
        context.Request.Headers["X-Forwarded-Host"] = "attacker.invalid";
        context.Request.Headers["X-Forwarded-Prefix"] = "/attacker";

        var middleware = new ForwardedHeadersMiddleware(_ => Task.CompletedTask, NullLoggerFactory.Instance, options);
        await middleware.Invoke(context);
        return context;
    }
}
