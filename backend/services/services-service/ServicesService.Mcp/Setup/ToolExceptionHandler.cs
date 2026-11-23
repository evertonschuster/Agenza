using Admin.SharedKernel;
using Microsoft.Extensions.Primitives;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Mcp.Extensions;

namespace ServicesService.Mcp.Setup;

public sealed class ToolExceptionHandler(
    ILogger<ToolExceptionHandler> logger,
    IHttpContextAccessor httpContextAccessor)
{
    public async ValueTask<CallToolResult> HandleAsync(
        RequestContext<CallToolRequestParams> context,
        McpRequestHandler<CallToolRequestParams, CallToolResult> next,
        CancellationToken cancellationToken)
    {
        try
        {
            return await next(context, cancellationToken);
        }
        catch (Exception exception) when (IsUnexpected(exception, cancellationToken))
        {
            var httpContext = httpContextAccessor.HttpContext;
            var traceId = SanitizeForLog(httpContext?.TraceIdentifier);
            var correlationId = SanitizeForLog(GetCorrelationId(httpContext));

            logger.LogError(exception,
                "Unhandled exception invoking MCP tool {ToolName} with TraceId {TraceId} and CorrelationId {CorrelationId}",
                SanitizeForLog(context.Params?.Name),
                traceId,
                correlationId);

            return Error.Failure("Unexpected.Error", "Ocorreu um erro inesperado.")
                .ToToolResult(traceId, correlationId);
        }
    }

    private static bool IsUnexpected(Exception exception, CancellationToken cancellationToken) => exception switch
    {
        McpException or InputRequiredException => false,
        OperationCanceledException => !cancellationToken.IsCancellationRequested,
        _ => true,
    };

    private static string? GetCorrelationId(HttpContext? httpContext)
    {
        if (httpContext is not null
            && httpContext.Request.Headers.TryGetValue("X-Correlation-Id", out var header)
            && !StringValues.IsNullOrEmpty(header))
        {
            return header.ToString();
        }

        return httpContext?.TraceIdentifier;
    }

    private static string? SanitizeForLog(string? value)
    {
        if (value is null)
        {
            return null;
        }

        return string.Concat(value.Select(character => char.IsControl(character) ? '_' : character));
    }
}
