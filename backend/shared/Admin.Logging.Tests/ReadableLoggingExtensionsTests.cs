using System.Globalization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using NSubstitute;
using Serilog;
using Serilog.Sinks.OpenTelemetry;

namespace Admin.Logging.Tests;

public class ReadableLoggingExtensionsTests
{
    [Fact]
    public void AddReadableLogging_LogsFromInformationByDefault()
    {
        using var provider = BuildProvider();
        var logger = provider.GetRequiredService<ILoggerFactory>().CreateLogger("Some.Application.Handler");

        logger.IsEnabled(LogLevel.Information).Should().BeTrue();
        logger.IsEnabled(LogLevel.Debug).Should().BeFalse();
    }

    [Theory]
    [InlineData("Microsoft.AspNetCore.Hosting.Diagnostics")]
    [InlineData("Microsoft.EntityFrameworkCore.Database.Command")]
    [InlineData("System.Net.Http.HttpClient.Default.ClientHandler")]
    [InlineData("Polly")]
    public void AddReadableLogging_QuietsNoisyFrameworkCategories(string category)
    {
        using var provider = BuildProvider();
        var logger = provider.GetRequiredService<ILoggerFactory>().CreateLogger(category);

        logger.IsEnabled(LogLevel.Information).Should().BeFalse();
        logger.IsEnabled(LogLevel.Warning).Should().BeTrue();
    }

    [Fact]
    public void AddReadableLogging_KeepsMigrationAndAuthenticationCategoriesAtInformation()
    {
        using var provider = BuildProvider();
        var factory = provider.GetRequiredService<ILoggerFactory>();

        factory.CreateLogger("Microsoft.EntityFrameworkCore.Migrations").IsEnabled(LogLevel.Information).Should().BeTrue();
        factory.CreateLogger("OpenIddict.Server.OpenIddictServerDispatcher").IsEnabled(LogLevel.Information).Should().BeTrue();
    }

    [Fact]
    public void AddReadableLogging_LetsConfigurationOverrideTheDefaults()
    {
        using var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel:Default"] = "Debug",
            ["Serilog:MinimumLevel:Override:Polly"] = "Information",
        });
        var factory = provider.GetRequiredService<ILoggerFactory>();

        factory.CreateLogger("Polly").IsEnabled(LogLevel.Information).Should().BeTrue();
        factory.CreateLogger("Some.Application.Handler").IsEnabled(LogLevel.Debug).Should().BeTrue();
    }

    [Fact]
    public void AddReadableLogging_LetsConfigurationAddCategories()
    {
        using var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["Serilog:MinimumLevel:Override:Aspire.Hosting.Dcp"] = "Warning",
        });
        var logger = provider.GetRequiredService<ILoggerFactory>().CreateLogger("Aspire.Hosting.Dcp.Process");

        logger.IsEnabled(LogLevel.Information).Should().BeFalse();
    }

    [Fact]
    public void AddReadableLogging_HonorsFiltersFromConfiguration()
    {
        var captured = new StringWriter();
        var previous = Console.Out;
        Console.SetOut(captured);

        try
        {
            using var provider = BuildProvider(new Dictionary<string, string?>
            {
                ["Serilog:Filter:0:Name"] = "ByExcluding",
                ["Serilog:Filter:0:Args:expression"] = "@mt like '%was successfully%'",
            });
            var logger = provider.GetRequiredService<ILoggerFactory>().CreateLogger("OpenIddict.Server.Dispatcher");

            logger.LogInformation("The request was successfully extracted");
            logger.LogInformation("The request was rejected because invalid scopes were specified");
        }
        finally
        {
            Console.SetOut(previous);
        }

        captured.ToString().Should().Contain("rejected because invalid scopes");
        captured.ToString().Should().NotContain("successfully extracted");
    }

    [Fact]
    public void AddReadableLogging_DoesNotReplaceTheStaticLogger()
    {
        using var provider = BuildProvider();

        provider.GetRequiredService<Serilog.ILogger>().Should().NotBeNull();
        Log.Logger.Should().BeSameAs(Serilog.Core.Logger.None);
    }

    [Fact]
    public void AddReadableLogging_WithAnOtlpEndpoint_BuildsTheExportingLogger()
    {
        using var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://collector.internal:4317",
        });

        provider.GetRequiredService<Serilog.ILogger>().Should().NotBeNull();
    }

    [Fact]
    public void ConfigureOtlp_UsesTheEndpointFromConfigurationAndTheInvariantCulture()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OTEL_EXPORTER_OTLP_ENDPOINT"] = "http://collector.internal:4317",
            })
            .Build();
        var options = new OpenTelemetrySinkOptions();

        ReadableLoggingExtensions.ConfigureOtlp(options, configuration);

        options.Endpoint.Should().Be("http://collector.internal:4317");
        options.FormatProvider.Should().BeSameAs(CultureInfo.InvariantCulture);
    }

    private static ServiceProvider BuildProvider(Dictionary<string, string?>? settings = null)
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(settings ?? [])
            .Build();
        var environment = Substitute.For<IHostEnvironment>();
        environment.EnvironmentName.Returns(Environments.Production);

        return new ServiceCollection()
            .AddReadableLogging(configuration, environment)
            .BuildServiceProvider();
    }
}
