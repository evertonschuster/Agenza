using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using Admin.SharedKernel;
using Admin.SharedKernel.ValueObjects;
using Microsoft.Extensions.AI;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;

namespace ServicesService.Mcp.Setup;

public static class ValueObjectToolExtensions
{
    public static IMcpServerBuilder WithValueObjectTools<T>(this IMcpServerBuilder builder) where T : class
    {
        var methods = typeof(T).GetMethods(BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance)
            .Where(method => method.GetCustomAttribute<McpServerToolAttribute>() is not null);

        foreach (var method in methods)
        {
            builder.Services.AddSingleton<McpServerTool>(services =>
            {
                var serializerOptions = new JsonSerializerOptions(McpJsonUtilities.DefaultOptions)
                    .AddValueObjectConverters(services.GetService<TimeProvider>() ?? TimeProvider.System);
                var options = new McpServerToolCreateOptions
                {
                    Services = services,
                    SerializerOptions = serializerOptions,
                    SchemaCreateOptions = new AIJsonSchemaCreateOptions { TransformSchemaNode = TransformSchema },
                };
                McpServerTool tool;
                if (method.IsStatic)
                {
                    tool = McpServerTool.Create(method, options: options);
                }
                else
                {
                    tool = McpServerTool.Create(method,
                        context => ActivatorUtilities.CreateInstance<T>(context.Services!), options);
                }

                ApplyParameterNullability(tool.ProtocolTool, method);
                return new ValueObjectMcpServerTool(tool, method, serializerOptions);
            });
        }

        return builder;
    }

    private static JsonNode TransformSchema(AIJsonSchemaCreateContext context, JsonNode schema)
    {
        var type = context.TypeInfo.Type;
        if (!StringValueObjects.Is(type) && !DateValueObjects.Is(type))
        {
            return schema;
        }

        var node = schema as JsonObject ?? new JsonObject();
        var nullable = context.PropertyInfo?.IsSetNullable ?? false;

        if (nullable)
        {
            node["type"] = new JsonArray("string", "null");
        }
        else
        {
            node["type"] = "string";
        }

        if (DateValueObjects.Is(type))
        {
            node["format"] = "date";
        }

        return node;
    }

    private static void ApplyParameterNullability(Tool tool, MethodInfo method)
    {
        var schema = JsonNode.Parse(tool.InputSchema.GetRawText())!;
        var nullability = new NullabilityInfoContext();
        foreach (var parameter in method.GetParameters())
        {
            if (!StringValueObjects.Is(parameter.ParameterType) && !DateValueObjects.Is(parameter.ParameterType))
            {
                continue;
            }

            if (nullability.Create(parameter).ReadState != NullabilityState.NotNull)
            {
                schema["properties"]![parameter.Name!]!["type"] = new JsonArray("string", "null");
            }
        }

        tool.InputSchema = JsonSerializer.SerializeToElement(schema);
    }
}
