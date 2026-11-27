using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using ServicesService.Mcp.Setup;

namespace ServicesService.McpTests;

public sealed class ResourceMetadataChallengeTests
{
    [Theory]
    [InlineData("https://mcpagenza.itactic.com.br/mcp", "/.well-known/oauth-protected-resource/mcp")]
    [InlineData("https://mcp.test/services/mcp", "/.well-known/oauth-protected-resource/services/mcp")]
    [InlineData("https://mcp.test/", "/.well-known/oauth-protected-resource/")]
    public async Task Desafio_preserva_https_publico_quando_o_proxy_usa_http_interno(string resource, string metadataPath)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Identity:Authority"] = "https://identity.test",
            ["Mcp:Resource"] = resource,
        }).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMcpForwardedHeaders();
        services.AddMcpAuthentication(configuration);
        await using var provider = services.BuildServiceProvider();
        var app = new ApplicationBuilder(provider);
        app.UseForwardedHeaders();
        app.Run(context => context.ChallengeAsync());
        var context = new DefaultHttpContext { RequestServices = provider };
        context.Request.Scheme = "http";
        context.Request.Host = new HostString(new Uri(resource).Host);
        context.Request.Path = new Uri(resource).AbsolutePath;
        context.Connection.RemoteIpAddress = IPAddress.Loopback;
        context.Request.Headers["X-Forwarded-Proto"] = "https";

        await app.Build()(context);

        context.Response.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
        var publicOrigin = new Uri(resource).GetLeftPart(UriPartial.Authority);
        context.Response.Headers.WWWAuthenticate.ToString().Should()
            .Contain($"resource_metadata=\"{publicOrigin}{metadataPath}\"");
    }

    [Fact]
    public async Task Metadados_sao_publicos_e_corretos_no_salto_http_do_proxy_local()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Identity:Authority"] = "https://identity.test",
            ["Mcp:Resource"] = "https://mcp.test/mcp",
        }).Build();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddMcpForwardedHeaders();
        services.AddMcpAuthentication(configuration);
        await using var provider = services.BuildServiceProvider();
        var app = new ApplicationBuilder(provider);
        app.UseForwardedHeaders();
        app.UseAuthentication();
        app.Run(context =>
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return Task.CompletedTask;
        });
        var context = new DefaultHttpContext { RequestServices = provider };
        context.Request.Scheme = "http";
        context.Request.Method = "GET";
        context.Request.Host = new HostString("mcp.test");
        context.Request.Path = "/.well-known/oauth-protected-resource/mcp";
        context.Connection.RemoteIpAddress = IPAddress.Loopback;
        context.Request.Headers["X-Forwarded-Proto"] = "https";
        await using var body = new MemoryStream();
        context.Response.Body = body;

        await app.Build()(context);

        context.Response.StatusCode.Should().Be(StatusCodes.Status200OK);
        body.Position = 0;
        using var metadata = await JsonDocument.ParseAsync(body, cancellationToken: TestContext.Current.CancellationToken);
        metadata.RootElement.GetProperty("resource").GetString().Should().Be("https://mcp.test/mcp");
        metadata.RootElement.GetProperty("authorization_servers")[0].GetString().Should().Be("https://identity.test");
    }
}
