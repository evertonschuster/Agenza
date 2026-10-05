using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Serilog;
using Serilog.Events;

namespace Admin.Logging;

internal sealed class RequestLoggingStartupFilter : IStartupFilter
{
    private readonly Serilog.ILogger _logger;
    private readonly string[] _quietPaths;

    public RequestLoggingStartupFilter(Serilog.ILogger logger, string[] quietPaths)
    {
        _logger = logger;
        _quietPaths = quietPaths;
    }

    public Action<IApplicationBuilder> Configure(Action<IApplicationBuilder> next)
    {
        return app =>
        {
            app.UseSerilogRequestLogging(options =>
            {
                options.Logger = _logger;
                options.GetLevel = GetLevel;
                options.GetMessageTemplateProperties = GetMessageTemplateProperties;
            });

            next(app);
        };
    }

    internal LogEventLevel GetLevel(HttpContext context, double elapsedMilliseconds, Exception? exception)
    {
        if (exception is not null || context.Response.StatusCode >= StatusCodes.Status500InternalServerError)
        {
            return LogEventLevel.Error;
        }

        if (IsQuiet(context.Request.Path))
        {
            return LogEventLevel.Verbose;
        }

        if (IsStaticFile(context))
        {
            return LogEventLevel.Verbose;
        }

        return LogEventLevel.Information;
    }

    internal static IEnumerable<LogEventProperty> GetMessageTemplateProperties(
        HttpContext context,
        string path,
        double elapsedMilliseconds,
        int statusCode)
    {
        yield return new LogEventProperty("RequestMethod", new ScalarValue(context.Request.Method));
        yield return new LogEventProperty("RequestPath", new ScalarValue(SanitizeForLog(path)));
        yield return new LogEventProperty("StatusCode", new ScalarValue(statusCode));
        yield return new LogEventProperty("Elapsed", new ScalarValue(elapsedMilliseconds));
    }

    // The decoded request path is attacker-controlled - a %0A in it would forge a log line (CWE-117).
    internal static string SanitizeForLog(string value)
    {
        return string.Concat(value.Select(character => char.IsControl(character) ? '_' : character));
    }

    private static bool IsStaticFile(HttpContext context)
    {
        return context.GetEndpoint() is null && context.Response.StatusCode < StatusCodes.Status400BadRequest;
    }

    private bool IsQuiet(PathString path)
    {
        return _quietPaths.Any(quietPath => path.StartsWithSegments(quietPath));
    }
}
