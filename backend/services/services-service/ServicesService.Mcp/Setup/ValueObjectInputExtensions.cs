using System.Text.Json;
using ModelContextProtocol.Server;

namespace ServicesService.Mcp.Setup;

public static class ValueObjectInputExtensions
{
    public static JsonSerializerOptions AddMcpValueObjectInputs(this IServiceCollection services, TimeProvider timeProvider)
    {
        var serializerOptions = McpWireFormat.Create(timeProvider);
        services.AddOptions<McpServerOptions>()
            .PostConfigure<IEnumerable<McpServerTool>>((_, tools) =>
            {
                foreach (var tool in tools)
                {
                    McpToolSchema.Configure(tool, serializerOptions);
                }
            });
        return serializerOptions;
    }
}
