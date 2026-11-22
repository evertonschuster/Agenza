using Admin.SharedKernel;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Mcp.Extensions;

namespace ServicesService.Mcp.Setup;

public sealed class ToolExceptionHandler(ILogger<ToolExceptionHandler> logger)
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
            var toolName = context.Params?.Name.Replace('\r', '_').Replace('\n', '_');
            logger.LogError(exception, "Unhandled exception invoking MCP tool {ToolName}", toolName);

            return Error.Failure("Unexpected.Error", "Ocorreu um erro inesperado.").ToToolResult();
        }
    }
}
