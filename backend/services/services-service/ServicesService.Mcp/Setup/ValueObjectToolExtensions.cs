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
                var inputProperties = tool.ProtocolTool.InputSchema.GetProperty("properties");
                var bindingOptions = new JsonSerializerOptions(serializerOptions)
                {
                    RespectNullableAnnotations = true,
                    RespectRequiredConstructorParameters = true,
                };
                var functionOptions = new AIFunctionFactoryOptions
                {
                    Name = tool.ProtocolTool.Name,
                    Description = tool.ProtocolTool.Description,
                    SerializerOptions = serializerOptions,
                    ExcludeResultSchema = true,
                    MarshalResult = (result, _, _) => new ValueTask<object?>(result),
                    ConfigureParameterBinding = parameter =>
                    {
                        if (parameter.ParameterType == typeof(IServiceProvider)
                            || parameter.ParameterType == typeof(AIFunctionArguments))
                        {
                            return default;
                        }

                        var name = parameter.Name!;
                        if (inputProperties.TryGetProperty(name, out _))
                        {
                            return new()
                            {
                                BindParameter = (parameter, arguments) => ToolArgumentBinder.Bind(parameter, name, arguments, bindingOptions),
                            };
                        }

                        return new()
                        {
                            ExcludeFromSchema = true,
                            BindParameter = BindService,
                        };
                    },
                };
                AIFunction function;
                if (method.IsStatic)
                {
                    function = AIFunctionFactory.Create(method, target: null, functionOptions);
                }
                else
                {
                    function = AIFunctionFactory.Create(method,
                        arguments => ActivatorUtilities.CreateInstance<T>(arguments.Services!), functionOptions);
                }

                var invocationTool = McpServerTool.Create(function, new McpServerToolCreateOptions
                {
                    SerializerOptions = serializerOptions,
                    Metadata = tool.Metadata,
                    UseStructuredContent = method.GetCustomAttribute<McpServerToolAttribute>()!.UseStructuredContent,
                    OutputSchema = tool.ProtocolTool.OutputSchema,
                });
                return new ValueObjectMcpServerTool(tool, invocationTool);
            });
        }

        return builder;
    }

    private static object? BindService(ParameterInfo parameter, AIFunctionArguments arguments)
    {
        var service = arguments.Services?.GetService(parameter.ParameterType);
        if (service is not null)
        {
            return service;
        }

        if (parameter.HasDefaultValue)
        {
            return parameter.DefaultValue;
        }

        throw new InvalidOperationException($"Missing service: {parameter.ParameterType.Name}.");
    }

    private static JsonNode TransformSchema(AIJsonSchemaCreateContext context, JsonNode schema)
    {
        if (schema is JsonObject objectSchema)
        {
            // O SDK pode reduzir um VO a string sem carregar os metadados da propriedade.
            ApplyPropertyMetadata(context.TypeInfo, objectSchema);
        }

        var type = context.TypeInfo.Type;
        var description = context.GetCustomAttribute<DescriptionAttribute>();
        var defaultValue = context.GetCustomAttribute<DefaultValueAttribute>();
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
            if (description is not null)
            {
                node["description"] = description.Description;
            }

            var defaultValue = property.AttributeProvider?.GetCustomAttributes(typeof(DefaultValueAttribute), true)
                .OfType<DefaultValueAttribute>()
                .FirstOrDefault();
            if (defaultValue is not null)
            {
                node["default"] = JsonSerializer.SerializeToNode(defaultValue.Value);
            }

            if (StringValueObjects.Is(property.PropertyType) || DateValueObjects.Is(property.PropertyType))
            {
                if (property.IsSetNullable)
                {
                    node["type"] = new JsonArray("string", "null");
                }
                else
                {
                    node["type"] = "string";
                }

                if (DateValueObjects.Is(property.PropertyType))
                {
                    node["format"] = "date";
                }
            }
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
