using System.ComponentModel;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization.Metadata;
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
            // O SDK injetaria o serviço sem chave no lugar do serviço com chave.
            if (method.GetParameters().Any(parameter => parameter.GetCustomAttribute<FromKeyedServicesAttribute>() is not null))
            {
                throw new NotSupportedException($"A ferramenta {typeof(T).Name}.{method.Name} usa [FromKeyedServices], que o SDK MCP não resolve.");
            }

            builder.Services.AddSingleton<McpServerTool>(services =>
            {
                var serializerOptions = McpWireFormat.Create(services.GetService<TimeProvider>() ?? TimeProvider.System);
                serializerOptions.RespectNullableAnnotations = true;
                serializerOptions.RespectRequiredConstructorParameters = true;
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
                return tool;
            });
        }

        return builder;
    }

    private static JsonNode TransformSchema(AIJsonSchemaCreateContext context, JsonNode schema)
    {
        if (schema is JsonObject objectSchema)
        {
            // O SDK pode reduzir um VO a string sem carregar os metadados da propriedade.
            ApplyPropertyMetadata(context.TypeInfo, objectSchema);
        }

        return ApplySchemaMetadata(schema, context.TypeInfo.Type, context.PropertyInfo?.IsSetNullable ?? false,
            context.GetCustomAttribute<DescriptionAttribute>(), context.GetCustomAttribute<DefaultValueAttribute>());
    }

    private static JsonNode ApplySchemaMetadata(JsonNode schema, Type type, bool nullable,
        DescriptionAttribute? description, DefaultValueAttribute? defaultValue)
    {
        var isValueObject = StringValueObjects.Is(type) || DateValueObjects.Is(type);
        if (!isValueObject && description is null && defaultValue is null)
        {
            return schema;
        }

        var node = schema as JsonObject ?? new JsonObject();
        if (description is not null)
        {
            node["description"] = description.Description;
        }

        if (defaultValue is not null)
        {
            node["default"] = JsonSerializer.SerializeToNode(defaultValue.Value);
        }

        if (!isValueObject)
        {
            return node;
        }

        node["type"] = nullable ? new JsonArray("string", "null") : JsonValue.Create("string");

        if (DateValueObjects.Is(type))
        {
            node["format"] = "date";
        }

        return node;
    }

    private static void ApplyPropertyMetadata(JsonTypeInfo typeInfo, JsonObject schema)
    {
        if (schema["properties"] is not JsonObject properties)
        {
            return;
        }

        foreach (var property in typeInfo.Properties)
        {
            if (properties[property.Name] is not JsonObject node)
            {
                continue;
            }

            var description = property.AttributeProvider?.GetCustomAttributes(typeof(DescriptionAttribute), true)
                .OfType<DescriptionAttribute>()
                .FirstOrDefault();
            var defaultValue = property.AttributeProvider?.GetCustomAttributes(typeof(DefaultValueAttribute), true)
                .OfType<DefaultValueAttribute>()
                .FirstOrDefault();
            ApplySchemaMetadata(node, property.PropertyType, property.IsSetNullable, description, defaultValue);
        }
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
