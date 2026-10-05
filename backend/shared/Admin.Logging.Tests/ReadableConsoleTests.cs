using System.Globalization;
using Serilog;

namespace Admin.Logging.Tests;

public class ReadableConsoleTests
{
    [Fact]
    public void Format_ShortensTheSourceContextToItsLastSegment()
    {
        var output = Render(colors: false, logger => logger
            .ForContext("SourceContext", "ServicesService.Application.Clients.CreateClientCommandHandler")
            .Information("Client {ClientId} created", 42));

        output.Should().MatchRegex(@"^\[\d{2}:\d{2}:\d{2} INF\] CreateClientCommandHandler: Client 42 created\n$");
    }

    [Fact]
    public void Format_WithoutASourceContext_OmitsIt()
    {
        var output = Render(colors: false, logger => logger.Warning("Something odd"));

        output.Should().MatchRegex(@"^\[\d{2}:\d{2}:\d{2} WRN\] Something odd\n$");
    }

    [Fact]
    public void Format_WithAnException_WritesItAfterTheMessageLine()
    {
        var output = Render(colors: false, logger => logger.Error(new InvalidOperationException("boom"), "Save failed"));

        var lines = output.Split('\n');
        lines[0].Should().EndWith("Save failed");
        lines[1].Should().Contain("InvalidOperationException: boom");
    }

    [Fact]
    public void Format_UsesTheInvariantCulture()
    {
        var previous = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = new CultureInfo("pt-BR");

        try
        {
            var output = Render(colors: false, logger => logger.Information("took {Elapsed:0.0000} ms", 35.8));

            output.Should().Contain("took 35.8000 ms");
        }
        finally
        {
            CultureInfo.CurrentCulture = previous;
        }
    }

    [Fact]
    public void Format_WithColors_EmitsAnsiCodesEvenWhenOutputIsRedirected()
    {
        var output = Render(colors: true, logger => logger.Information("hello"));

        output.Should().Contain("\u001b[");
    }

    [Fact]
    public void Format_WithoutColors_EmitsNoAnsiCodes()
    {
        var output = Render(colors: false, logger => logger.Information("hello"));

        output.Should().NotContain("\u001b[");
    }

    [Theory]
    [InlineData(true, false, false, false, true)]
    [InlineData(true, false, true, false, false)]
    [InlineData(true, false, true, true, true)]
    [InlineData(true, true, false, true, false)]
    [InlineData(false, false, false, true, false)]
    public void ShouldUseColors_FollowsEnvironmentRedirectionAndNoColor(
        bool isDevelopment,
        bool noColorRequested,
        bool outputRedirected,
        bool colorWhenRedirected,
        bool expected)
    {
        var colors = ReadableConsole.ShouldUseColors(isDevelopment, noColorRequested, outputRedirected, colorWhenRedirected);

        colors.Should().Be(expected);
    }

    private static string Render(bool colors, Action<Serilog.ILogger> write)
    {
        var output = new StringWriter();
        var logger = new LoggerConfiguration()
            .WriteTo.Sink(new FormattingSink(ReadableConsole.CreateFormatter(colors), output))
            .CreateLogger();

        write(logger);

        return output.ToString();
    }
}
