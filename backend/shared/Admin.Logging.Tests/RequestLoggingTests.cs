using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.DependencyInjection;
using Serilog;
using Serilog.Events;
using Serilog.Extensions.Hosting;

namespace Admin.Logging.Tests;

public class RequestLoggingTests
{
    private readonly CollectingSink _sink = new();

    [Fact]
    public async Task AddRequestLogging_LogsOneInformationEventPerRequestAndRunsTheApplicationPipeline()
    {
        var innerRan = false;

        await SendAsync("/api/v1/tags", context =>
        {
            innerRan = true;
            context.Response.StatusCode = StatusCodes.Status200OK;
            return Task.CompletedTask;
        });

        innerRan.Should().BeTrue();
        var logged = _sink.Events.Should().ContainSingle().Subject;
        logged.Level.Should().Be(LogEventLevel.Information);
        Property(logged, "RequestMethod").Should().Be("GET");
        Property(logged, "RequestPath").Should().Be("/api/v1/tags");
        Property(logged, "StatusCode").Should().Be(200);
    }

    [Fact]
    public async Task AddRequestLogging_StripsControlCharactersFromTheLoggedPath()
    {
        await SendAsync("/api/v1/x\nFORGED ERR line\u001b[31m", _ => Task.CompletedTask);

        var path = (string)Property(_sink.Events.Single(), "RequestPath")!;
        path.Should().Be("/api/v1/x_FORGED ERR line_[31m");
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/alive")]
    [InlineData("/health/ready")]
    public async Task AddRequestLogging_LogsQuietPathsBelowInformation(string path)
    {
        await SendAsync(path, _ => Task.CompletedTask, quietPaths: ["/health", "/alive"]);

        _sink.Events.Should().ContainSingle().Which.Level.Should().Be(LogEventLevel.Verbose);
    }

    [Theory]
    [InlineData("/health")]
    [InlineData("/alive")]
    public async Task AddRequestLogging_LogsAFailingQuietPathAsAnError(string path)
    {
        await SendAsync(path, context =>
        {
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            return Task.CompletedTask;
        }, quietPaths: ["/health", "/alive"]);

        _sink.Events.Should().ContainSingle().Which.Level.Should().Be(LogEventLevel.Error);
    }

    [Fact]
    public async Task AddRequestLogging_LogsAnExceptionOnAQuietPathAsAnErrorAndRethrowsIt()
    {
        var send = () => SendAsync("/health", _ => throw new InvalidOperationException("boom"), quietPaths: ["/health"]);

        await send.Should().ThrowAsync<InvalidOperationException>();
        _sink.Events.Should().ContainSingle().Which.Level.Should().Be(LogEventLevel.Error);
    }

    [Fact]
    public async Task AddRequestLogging_LogsAFileServedWithoutAnEndpointBelowInformation()
    {
        await SendAsync("/js/login.js", _ => Task.CompletedTask, matchesEndpoint: false);

        _sink.Events.Should().ContainSingle().Which.Level.Should().Be(LogEventLevel.Verbose);
    }

    [Fact]
    public async Task AddRequestLogging_LogsARequestNoEndpointAnsweredWithAnErrorStatusAtInformation()
    {
        await SendAsync("/nao-existe", context =>
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return Task.CompletedTask;
        }, matchesEndpoint: false);

        _sink.Events.Should().ContainSingle().Which.Level.Should().Be(LogEventLevel.Information);
    }

    [Fact]
    public async Task AddRequestLogging_LogsAServerErrorResponseAsAnError()
    {
        await SendAsync("/api/v1/tags", context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            return Task.CompletedTask;
        });

        _sink.Events.Should().ContainSingle().Which.Level.Should().Be(LogEventLevel.Error);
    }

    [Fact]
    public async Task AddRequestLogging_LogsAnUnhandledExceptionAsAnErrorAndRethrowsIt()
    {
        var send = () => SendAsync("/api/v1/tags", _ => throw new InvalidOperationException("boom"));

        await send.Should().ThrowAsync<InvalidOperationException>();
        var logged = _sink.Events.Should().ContainSingle().Subject;
        logged.Level.Should().Be(LogEventLevel.Error);
        logged.Exception.Should().BeOfType<InvalidOperationException>();
    }

    private async Task SendAsync(
        string path,
        RequestDelegate inner,
        string[]? quietPaths = null,
        bool matchesEndpoint = true)
    {
        var logger = new LoggerConfiguration()
            .MinimumLevel.Verbose()
            .WriteTo.Sink(_sink)
            .CreateLogger();
        var services = new ServiceCollection()
            .AddSingleton<Serilog.ILogger>(logger)
            .AddSingleton(new DiagnosticContext(logger))
            .AddRequestLogging(quietPaths ?? []);
        using var provider = services.BuildServiceProvider();

        var app = new ApplicationBuilder(provider);
        provider.GetRequiredService<IStartupFilter>().Configure(builder => builder.Run(inner))(app);

        var context = new DefaultHttpContext { RequestServices = provider };
        context.Request.Method = HttpMethods.Get;
        context.Request.Path = path;
        context.Features.GetRequiredFeature<IHttpRequestFeature>().RawTarget = path;

        if (matchesEndpoint)
        {
            context.SetEndpoint(new Endpoint(_ => Task.CompletedTask, new EndpointMetadataCollection(), "test"));
        }

        await app.Build()(context);
    }

    private static object? Property(LogEvent logEvent, string name)
    {
        return ((ScalarValue)logEvent.Properties[name]).Value;
    }
}
