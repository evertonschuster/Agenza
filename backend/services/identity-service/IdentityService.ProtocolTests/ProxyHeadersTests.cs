using System.Net;
using IdentityService.Api.Setup;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;

namespace IdentityService.ProtocolTests;

public sealed class ProxyHeadersTests
{
    [Theory]
    [InlineData("127.0.0.1")]
    [InlineData("::1")]
    public async Task Proxy_local_restaura_https_e_ip_do_visitante(string remoteIp)
    {
        var context = await RunAsync(remoteIp, "https", "198.51.100.10");

        context.Request.Scheme.Should().Be("https");
        context.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse("198.51.100.10"));
        context.Request.Host.Value.Should().Be("identityagenza.itactic.com.br");
        context.Request.Path.Value.Should().Be("/.well-known/openid-configuration");
        context.Request.PathBase.Value.Should().BeNullOrEmpty();
    }

    [Theory]
    [InlineData("10.0.0.20")]
    [InlineData("198.51.100.10")]
    public async Task Origem_nao_confiavel_nao_altera_protocolo_nem_ip(string remoteIp)
    {
        var context = await RunAsync(remoteIp, "https", "198.51.100.10");

        context.Request.Scheme.Should().Be("http");
        context.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse(remoteIp));
    }

    [Fact]
    public async Task Somente_o_salto_mais_proximo_do_proxy_e_processado()
    {
        var context = await RunAsync("127.0.0.1", "http,https", "198.51.100.10,203.0.113.10");

        context.Request.Scheme.Should().Be("https");
        context.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse("203.0.113.10"));
    }

    [Fact]
    public async Task Sem_cabecalhos_encaminhados_a_requisicao_permanece_http()
    {
        var context = await RunAsync("127.0.0.1", "", "");

        context.Request.Scheme.Should().Be("http");
        context.Connection.RemoteIpAddress.Should().Be(IPAddress.Loopback);
    }

    private static async Task<DefaultHttpContext> RunAsync(string remoteIp, string protocol, string forwardedFor)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddIdentityForwardedHeaders();
        await using var provider = services.BuildServiceProvider();
        var app = new ApplicationBuilder(provider);
        app.UseForwardedHeaders();
        app.Run(_ => Task.CompletedTask);
        var context = new DefaultHttpContext { RequestServices = provider };
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("identityagenza.itactic.com.br");
        context.Request.Path = "/.well-known/openid-configuration";
        context.Connection.RemoteIpAddress = IPAddress.Parse(remoteIp);
        context.Request.Headers["X-Forwarded-Proto"] = protocol;
        context.Request.Headers["X-Forwarded-For"] = forwardedFor;
        context.Request.Headers["X-Forwarded-Host"] = "untrusted.example";
        context.Request.Headers["X-Forwarded-Prefix"] = "/untrusted";

        await app.Build()(context);

        return context;
    }
}
