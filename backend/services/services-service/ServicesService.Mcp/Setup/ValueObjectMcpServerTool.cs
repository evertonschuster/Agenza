using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Mcp.Extensions;

namespace ServicesService.Mcp.Setup;

internal sealed class ValueObjectMcpServerTool(McpServerTool contract, McpServerTool invocation) : McpServerTool
{
    public override Tool ProtocolTool => contract.ProtocolTool;

    public override IReadOnlyList<object> Metadata => contract.Metadata;

    public override async ValueTask<CallToolResult> InvokeAsync(
        RequestContext<CallToolRequestParams> request, CancellationToken cancellationToken = default)
    {
        try
        {
            return await invocation.InvokeAsync(request, cancellationToken);
        }
        catch (ToolArgumentBinder.BindingException exception)
        {
            return exception.Error.ToToolResult();
        }
    }
}
