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
        catch (Exception exception) when (
            exception is not McpException and not InputRequiredException
            && !(exception is OperationCanceledException && cancellationToken.IsCancellationRequested))
        {
            var httpContext = httpContextAccessor.HttpContext;
            var traceId = httpContext?.TraceIdentifier;
            var correlationId = httpContext is not null
                && httpContext.Request.Headers.TryGetValue("X-Correlation-Id", out var header)
                && !StringValues.IsNullOrEmpty(header)
                    ? header.ToString()
                    : traceId;

            logger.LogError(exception,
                "Unhandled exception invoking MCP tool {ToolName} with TraceId {TraceId} and CorrelationId {CorrelationId}",
                SanitizeForLog(context.Params?.Name),
                SanitizeForLog(traceId),
                SanitizeForLog(correlationId));

            return Error.Failure("Unexpected.Error", "Ocorreu um erro inesperado.")
                .ToToolResult(traceId, correlationId);
        }
    }

    private static string? SanitizeForLog(string? value) => value?.Replace('\r', '_').Replace('\n', '_');
}
