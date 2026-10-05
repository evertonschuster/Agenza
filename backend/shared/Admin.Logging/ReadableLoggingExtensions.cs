using System.Globalization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Serilog;
using Serilog.Events;

namespace Admin.Logging;

public static class ReadableLoggingExtensions
{
    private const string OtlpEndpointKey = "OTEL_EXPORTER_OTLP_ENDPOINT";

    private static readonly string[] QuietCategories =
    [
        "Microsoft.AspNetCore",
        "Microsoft.EntityFrameworkCore.Database.Command",
        "System.Net.Http.HttpClient",
        "Polly",
    ];

    public static IServiceCollection AddReadableLogging(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment,
        bool colorWhenRedirected = false)
    {
        var colors = ReadableConsole.ShouldUseColors(
            environment.IsDevelopment(),
            noColorRequested: !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("NO_COLOR")),
            outputRedirected: Console.IsOutputRedirected,
            colorWhenRedirected);
        var exportToOtlp = !string.IsNullOrWhiteSpace(configuration[OtlpEndpointKey]);

        services.AddSerilog(
            logger => Configure(logger, configuration, colors, exportToOtlp),
            preserveStaticLogger: true);

        return services;
    }

    private static void Configure(
        LoggerConfiguration logger,
        IConfiguration configuration,
        bool colors,
        bool exportToOtlp)
    {
        logger.MinimumLevel.Information();

        foreach (var category in QuietCategories)
        {
            logger.MinimumLevel.Override(category, LogEventLevel.Warning);
        }

        logger
            .ReadFrom.Configuration(configuration)
            .Enrich.FromLogContext()
            .WriteTo.Console(ReadableConsole.CreateFormatter(colors));

        if (exportToOtlp)
        {
            logger.WriteTo.OpenTelemetry(options => options.FormatProvider = CultureInfo.InvariantCulture);
        }
    }
}
