using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace Admin.SharedKernel.AspNetCore;

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
        if (exception is BadHttpRequestException rejectedRequest)
        {
            _logger.LogWarning(
                "Rejected {Method} {Path} with {StatusCode}",
                SanitizeForLog(httpContext.Request.Method),
                SanitizeForLog(httpContext.Request.Path.Value),
                rejectedRequest.StatusCode);

            await WriteProblemAsync(
                httpContext,
                rejectedRequest.StatusCode,
                ApiProblemDetailsFactory.CreateRequestProblem(rejectedRequest.StatusCode, httpContext),
                cancellationToken);
            return true;
        }

        _logger.LogError(
            exception,
            "Unhandled exception processing {Method} {Path}",
            SanitizeForLog(httpContext.Request.Method),
            SanitizeForLog(httpContext.Request.Path.Value));

        await WriteProblemAsync(
            httpContext,
            StatusCodes.Status500InternalServerError,
            ApiProblemDetailsFactory.CreateUnexpectedProblem(httpContext),
            cancellationToken);
        return true;
    }

    private static async Task WriteProblemAsync(
        HttpContext httpContext,
        int statusCode,
        ApiProblemDetails problem,
        CancellationToken cancellationToken)
    {
        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(
            problem,
            options: null,
            contentType: "application/problem+json",
            cancellationToken);
    }

    // Request.Method/Path are attacker-controlled - strip CR/LF so they
    // can't forge fake log lines (CWE-117).
    private static string SanitizeForLog(string? value) =>
        value?.Replace('\r', '_').Replace('\n', '_') ?? string.Empty;
}
