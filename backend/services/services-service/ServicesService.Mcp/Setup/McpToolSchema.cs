using System.ComponentModel;
using System.Reflection;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization.Metadata;
using Admin.SharedKernel.ValueObjects;
using Microsoft.Extensions.AI;
using ModelContextProtocol.Server;

namespace ServicesService.Mcp.Setup;

internal static class McpToolSchema
{
    public static void Configure(McpServerTool tool, JsonSerializerOptions serializerOptions)
    {
        if (tool.Metadata.OfType<MethodInfo>().FirstOrDefault() is not { } method)
        {
            return;
        }

        var parameters = tool.ProtocolTool.InputSchema.GetProperty("properties");
        var schemaOptions = new AIJsonSchemaCreateOptions
        {
            TransformSchemaNode = Transform,
            IncludeParameter = parameter => parameter.Name is { } name && parameters.TryGetProperty(name, out _),
        };
        tool.ProtocolTool.InputSchema = AIJsonUtilities.CreateFunctionJsonSchema(method,
            serializerOptions: serializerOptions, inferenceOptions: schemaOptions);
        if (method.GetCustomAttribute<McpServerToolAttribute>()?.OutputSchemaType is { } outputType)
        {
            tool.ProtocolTool.OutputSchema = AIJsonUtilities.CreateJsonSchema(outputType,
                serializerOptions: serializerOptions, inferenceOptions: schemaOptions);
        }
    }

    private static JsonNode Transform(AIJsonSchemaCreateContext context, JsonNode schema)
    {
        var type = context.TypeInfo.Type;
        MapProperties(context.TypeInfo, schema);
        MapCollection(context, schema);
        if (!IsValueObject(type))
        {
            return schema;
        }

        var nullable = context.PropertyInfo?.IsGetNullable
            ?? (context.ParameterAttributeProvider is ParameterInfo parameter
                ? new NullabilityInfoContext().Create(parameter).ReadState != NullabilityState.NotNull
                : true);
        return ValueObjectSchema(type, nullable, schema);
    }

    private static void MapProperties(JsonTypeInfo typeInfo, JsonNode schema)
    {
        if (schema is not JsonObject objectSchema || objectSchema["properties"] is not JsonObject properties)
        {
            return;
        }

        // The exporter can skip callbacks for unconstrained converter schemas; the parent still has their metadata.
        foreach (var property in typeInfo.Properties)
        {
            if (!properties.TryGetPropertyValue(property.Name, out var propertySchema))
            {
                continue;
            }

            var mappedProperty = IsValueObject(property.PropertyType)
                ? ValueObjectSchema(property.PropertyType, property.IsGetNullable, propertySchema)
                : propertySchema as JsonObject;
            if (mappedProperty is null)
            {
                continue;
            }

            if (property.AttributeProvider?.GetCustomAttributes(typeof(DescriptionAttribute), true).FirstOrDefault() is DescriptionAttribute description)
            {
                mappedProperty["description"] = description.Description;
            }

            if (property.AttributeProvider?.GetCustomAttributes(typeof(DefaultValueAttribute), true).FirstOrDefault() is DefaultValueAttribute defaultValue)
            {
                mappedProperty["default"] = JsonSerializer.SerializeToNode(defaultValue.Value, typeInfo.Options);
            }

            properties[property.Name] = mappedProperty;
        }
    }

    private static void MapCollection(AIJsonSchemaCreateContext context, JsonNode schema)
    {
        if (context.TypeInfo.ElementType is not { } elementType || !IsValueObject(elementType) || schema is not JsonObject collectionSchema)
        {
            return;
        }

        var nullability = context.PropertyAttributeProvider switch
        {
            PropertyInfo property => new NullabilityInfoContext().Create(property),
            FieldInfo field => new NullabilityInfoContext().Create(field),
            _ => context.ParameterAttributeProvider is ParameterInfo parameter ? new NullabilityInfoContext().Create(parameter) : null,
        };
        var elementNullable = (nullability?.ElementType ?? nullability?.GenericTypeArguments.LastOrDefault())?.ReadState != NullabilityState.NotNull;
        var keyword = context.TypeInfo.Kind == JsonTypeInfoKind.Dictionary ? "additionalProperties" : "items";
        collectionSchema[keyword] = ValueObjectSchema(elementType, elementNullable, collectionSchema[keyword]);
    }

    private static bool IsValueObject(Type type) => StringValueObjects.Is(type) || DateValueObjects.Is(type);

    private static JsonObject ValueObjectSchema(Type type, bool nullable, JsonNode? schema)
    {
        var mapped = schema as JsonObject ?? new JsonObject();
        mapped["type"] = nullable ? new JsonArray("string", "null") : JsonValue.Create("string");
        if (DateValueObjects.Is(type))
        {
            mapped["format"] = "date";
        }

        return mapped;
    }
}
