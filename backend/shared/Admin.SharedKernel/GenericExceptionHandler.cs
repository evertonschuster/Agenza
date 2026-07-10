using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Admin.SharedKernel;

public class GenericExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GenericExceptionHandler> _logger;

    public GenericExceptionHandler(ILogger<GenericExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        _logger.LogError(
            exception,
            "Unhandled exception processing {Method} {Path}",
            SanitizeForLog(httpContext.Request.Method),
            SanitizeForLog(httpContext.Request.Path.Value));

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await httpContext.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Status = StatusCodes.Status500InternalServerError,
                Title = "An unexpected error occurred.",
            },
            cancellationToken);

        return true;
    }

    // Request.Method/Path are attacker-controlled - strip CR/LF so they
    // can't forge fake log lines (CWE-117).
    private static string SanitizeForLog(string? value) =>
        value?.Replace('\r', '_').Replace('\n', '_') ?? string.Empty;
}
