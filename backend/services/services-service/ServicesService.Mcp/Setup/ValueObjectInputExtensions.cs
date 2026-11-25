using System.Text.Json;
using System.Text.Json.Serialization.Metadata;
using ModelContextProtocol.Server;
using ServicesService.Application.Tags.UpdateTag;

namespace ServicesService.Mcp.Setup;

public static class ValueObjectInputExtensions
{
    public static JsonSerializerOptions AddMcpValueObjectInputs(this IServiceCollection services, TimeProvider timeProvider)
    {
        var serializerOptions = McpWireFormat.Create(timeProvider);
        serializerOptions.TypeInfoResolver = (serializerOptions.TypeInfoResolver ?? new DefaultJsonTypeInfoResolver())
            .WithAddedModifier(typeInfo =>
            {
                if (typeInfo.Type == typeof(UpdateTagCommand))
                {
                    // An omitted description must not silently clear it on a tool call.
                    typeInfo.Properties.Single(property => property.Name == "description").IsRequired = true;
                }
            });

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
