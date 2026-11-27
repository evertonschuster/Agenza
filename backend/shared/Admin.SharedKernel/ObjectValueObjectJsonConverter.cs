using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Admin.SharedKernel;

internal sealed class ObjectValueObjectJsonConverter<T> : JsonConverter<T>
    where T : class, IObjectValueObject<T>
{
    private const string NotAnObject = "Informe um objeto com os campos do valor.";
    private const string DuplicatedPart = "Informe cada campo do valor uma única vez.";

    private readonly MethodInfo _create = ObjectValueObjects.CreateOf(typeof(T));
    private readonly ParameterInfo[] _parts;
    private readonly PropertyInfo[] _properties;
    private readonly JsonEncodedText[] _names;
    private readonly object?[] _defaults;
    private readonly Dictionary<string, int> _indexByName;

    public ObjectValueObjectJsonConverter(JsonSerializerOptions options)
    {
        _parts = _create.GetParameters();
        _properties = _parts
            .Select(part => typeof(T).GetProperty(part.Name!, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
                ?? throw new InvalidOperationException($"{typeof(T).Name} must expose a property named like its Create parameter '{part.Name}'."))
            .ToArray();
        var names = _parts
            .Select(part => ObjectValueObjects.WireNameOf(typeof(T), part.Name!, options.PropertyNamingPolicy))
            .ToArray();
        _names = names.Select(name => JsonEncodedText.Encode(name)).ToArray();
        _defaults = _parts.Select(part => part.HasDefaultValue ? part.DefaultValue : null).ToArray();

        _indexByName = new(options.PropertyNameCaseInsensitive ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);

        for (var index = 0; index < names.Length; index++)
        {
            _indexByName[names[index]] = index;
        }
    }

    public override T? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.StartObject)
        {
            throw new JsonException(NotAnObject);
        }

        var arguments = (object?[])_defaults.Clone();
        var seen = new bool[_parts.Length];

        while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
        {
            var found = _indexByName.TryGetValue(reader.GetString()!, out var index);
            reader.Read();

            if (found)
            {
                if (seen[index])
                {
                    throw new JsonException(DuplicatedPart);
                }

                seen[index] = true;
                arguments[index] = JsonSerializer.Deserialize(ref reader, _parts[index].ParameterType, options);
            }
            else
            {
                reader.Skip();
            }
        }

        var result = (ParseResult<T>)_create.Invoke(null, arguments)!;

        return result.IsSuccess ? result.Value : throw new JsonException(result.Error);
    }

    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
    {
        writer.WriteStartObject();

        for (var index = 0; index < _properties.Length; index++)
        {
            writer.WritePropertyName(_names[index]);
            JsonSerializer.Serialize(writer, _properties[index].GetValue(value), _properties[index].PropertyType, options);
        }

        writer.WriteEndObject();
    }
}
