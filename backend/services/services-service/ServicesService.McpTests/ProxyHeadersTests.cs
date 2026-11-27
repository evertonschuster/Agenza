using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using ServicesService.Mcp.Setup;

namespace ServicesService.McpTests;

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
    }

    [Fact]
    public async Task Origem_nao_confiavel_nao_altera_protocolo_nem_ip()
    {
        var context = await RunAsync("10.0.0.20", "https", "198.51.100.10");

        context.Request.Scheme.Should().Be("http");
        context.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse("10.0.0.20"));
    }

    [Fact]
    public async Task Somente_o_salto_mais_proximo_do_proxy_e_processado()
    {
        var context = await RunAsync("127.0.0.1", "http,https", "198.51.100.10,203.0.113.10");

        context.Request.Scheme.Should().Be("https");
        context.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse("203.0.113.10"));
    }

    private static async Task<DefaultHttpContext> RunAsync(string remoteIp, string protocol, string forwardedFor)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMcpForwardedHeaders();
        await using var provider = services.BuildServiceProvider();
        var app = new ApplicationBuilder(provider);
        app.UseForwardedHeaders();
        app.Run(_ => Task.CompletedTask);
        var context = new DefaultHttpContext { RequestServices = provider };
        context.Request.Scheme = "http";
        context.Connection.RemoteIpAddress = IPAddress.Parse(remoteIp);
        context.Request.Headers["X-Forwarded-Proto"] = protocol;
        context.Request.Headers["X-Forwarded-For"] = forwardedFor;

        await app.Build()(context);

        return context;
    }
}
