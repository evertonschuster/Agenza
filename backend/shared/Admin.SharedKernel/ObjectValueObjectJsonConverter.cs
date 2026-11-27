using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Admin.SharedKernel;

internal sealed class ObjectValueObjectJsonConverter<T> : JsonConverter<T>
    where T : class, IObjectValueObject<T>
{
    private const string NotAnObject = "Informe um objeto com os campos do valor.";

    private readonly MethodInfo _create = ObjectValueObjects.CreateOf(typeof(T));
    private readonly ParameterInfo[] _parts;
    private readonly PropertyInfo[] _properties;

    public ObjectValueObjectJsonConverter()
    {
        _parts = _create.GetParameters();
        _properties = _parts
            .Select(part => typeof(T).GetProperty(part.Name!, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
                ?? throw new InvalidOperationException($"{typeof(T).Name} must expose a property named like its Create parameter '{part.Name}'."))
            .ToArray();
    }

    public override T? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var document = JsonDocument.ParseValue(ref reader);
        var root = document.RootElement;

        if (root.ValueKind != JsonValueKind.Object)
        {
            throw new JsonException(NotAnObject);
        }

        var arguments = _parts.Select(part => ReadPart(root, part, options)).ToArray();
        var result = (ParseResult<T>)_create.Invoke(null, arguments)!;

        return result.IsSuccess ? result.Value : throw new JsonException(result.Error);
    }

    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();

        foreach (var property in _properties)
        {
            writer.WritePropertyName(options.PropertyNamingPolicy?.ConvertName(property.Name) ?? property.Name);
            JsonSerializer.Serialize(writer, property.GetValue(value), property.PropertyType, options);
        }

        writer.WriteEndObject();
    }

    private static object? ReadPart(JsonElement root, ParameterInfo part, JsonSerializerOptions options)
    {
        foreach (var member in root.EnumerateObject())
        {
            if (string.Equals(member.Name, part.Name, StringComparison.OrdinalIgnoreCase))
            {
                return member.Value.Deserialize(part.ParameterType, options);
            }
        }

        return part.HasDefaultValue ? part.DefaultValue : null;
    }
}
