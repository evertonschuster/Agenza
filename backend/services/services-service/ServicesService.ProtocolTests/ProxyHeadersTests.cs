using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ServicesService.Api.Setup;

namespace ServicesService.ProtocolTests;

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
        context.Response.StatusCode.Should().Be(StatusCodes.Status204NoContent);
        context.Response.Headers.Location.Should().BeEmpty();
    }

    [Theory]
    [InlineData("10.0.0.20")]
    [InlineData("127.0.0.2")]
    [InlineData("198.51.100.20")]
    public async Task Origem_nao_confiavel_nao_altera_protocolo_nem_ip(string remoteIp)
    {
        var context = await RunAsync(remoteIp, "https", "198.51.100.10");

        context.Request.Scheme.Should().Be("http");
        context.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse(remoteIp));
        context.Response.StatusCode.Should().Be(StatusCodes.Status307TemporaryRedirect);
        context.Response.Headers.Location.ToString().Should().Be("https://api.test/api/v1/clients");
    }

    [Fact]
    public async Task Somente_o_salto_mais_proximo_do_proxy_e_processado()
    {
        var context = await RunAsync("127.0.0.1", "http,https", "198.51.100.10,203.0.113.10");

        context.Request.Scheme.Should().Be("https");
        context.Connection.RemoteIpAddress.Should().Be(IPAddress.Parse("203.0.113.10"));
    }

    [Fact]
    public async Task Cabecalho_de_host_encaminhado_nao_substitui_o_host_da_requisicao()
    {
        var context = await RunAsync("127.0.0.1", "https", "198.51.100.10", forwardedHost: "outro.example");

        context.Request.Host.Value.Should().Be("api.test");
        context.Response.StatusCode.Should().Be(StatusCodes.Status204NoContent);
    }

    [Fact]
    public async Task Requisicao_http_sem_cabecalhos_continua_redirecionando_para_https()
    {
        var context = await RunAsync("127.0.0.1", protocol: null, forwardedFor: null);

        context.Request.Scheme.Should().Be("http");
        context.Response.StatusCode.Should().Be(StatusCodes.Status307TemporaryRedirect);
        context.Response.Headers.Location.ToString().Should().Be("https://api.test/api/v1/clients");
    }

    private static async Task<DefaultHttpContext> RunAsync(string remoteIp, string? protocol, string? forwardedFor, string? forwardedHost = null)
    {
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().Build());
        services.AddApiForwardedHeaders();
        services.AddHttpsRedirection(options => options.HttpsPort = 443);
        await using var provider = services.BuildServiceProvider();
        var app = new ApplicationBuilder(provider);
        app.UseForwardedHeaders();
        app.UseHttpsRedirection();
        app.Run(context =>
        {
            context.Response.StatusCode = StatusCodes.Status204NoContent;
            return Task.CompletedTask;
        });
        var context = new DefaultHttpContext { RequestServices = provider };
        context.Request.Scheme = "http";
        context.Request.Host = new HostString("api.test");
        context.Request.Path = "/api/v1/clients";
        context.Connection.RemoteIpAddress = IPAddress.Parse(remoteIp);
        if (protocol is not null) context.Request.Headers["X-Forwarded-Proto"] = protocol;
        if (forwardedFor is not null) context.Request.Headers["X-Forwarded-For"] = forwardedFor;
        if (forwardedHost is not null) context.Request.Headers["X-Forwarded-Host"] = forwardedHost;

        await app.Build()(context);

        return context;
    }
}
