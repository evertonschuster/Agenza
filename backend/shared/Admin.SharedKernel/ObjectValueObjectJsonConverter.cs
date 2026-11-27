using System.Reflection;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.Json.Serialization.Metadata;

namespace Admin.SharedKernel;

// The value object declares nothing for JSON: the parameters of its Create are its parts. Everything
// that needs reflection is resolved once per type here; Read and Write only call typed delegates.
internal sealed class ObjectValueObjectJsonConverter<T> : JsonConverter<T>
    where T : class, IObjectValueObject<T>
{
    private const string NotAnObject = "Informe um objeto com os campos do valor.";
    private const string DuplicatedPart = "Informe cada campo do valor uma única vez.";

    private readonly MethodInfo _create = ObjectValueObjects.CreateOf(typeof(T));
    private readonly Part[] _parts;
    private readonly Dictionary<string, int> _indexByName;

    public ObjectValueObjectJsonConverter(JsonSerializerOptions options)
    {
        _parts = _create.GetParameters().Select(parameter => Part.For(typeof(T), parameter, options)).ToArray();
        Console.WriteLine($"[ObjectVO<{typeof(T).Name}>] converter criado: partes = {string.Join(", ", _parts.Select(part => part.Name))}");
        _indexByName = new(options.PropertyNameCaseInsensitive ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);

        for (var index = 0; index < _parts.Length; index++)
        {
            _indexByName[_parts[index].Name] = index;
        }
    }

    public override T? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.StartObject)
        {
            throw new JsonException(NotAnObject);
        }

        Console.WriteLine($"[ObjectVO<{typeof(T).Name}>] Read");
        var arguments = new object?[_parts.Length];
        var seen = new bool[_parts.Length];

        for (var index = 0; index < _parts.Length; index++)
        {
            arguments[index] = _parts[index].Absent;
        }

        while (reader.Read() && reader.TokenType == JsonTokenType.PropertyName)
        {
            var found = _indexByName.TryGetValue(reader.GetString()!, out var index);
            reader.Read();

            if (!found)
            {
                reader.Skip();
            }
            else if (seen[index])
            {
                throw new JsonException(DuplicatedPart);
            }
            else
            {
                seen[index] = true;
                arguments[index] = _parts[index].Read(ref reader, options);
                Console.WriteLine($"[ObjectVO<{typeof(T).Name}>] parte '{_parts[index].Name}' lida");
            }
        }

        // DoNotWrapExceptions: whatever Create throws reaches the caller as itself, not as a TargetInvocationException.
        Console.WriteLine($"[ObjectVO<{typeof(T).Name}>] chamando Create com {arguments.Length} argumento(s)");
        var result = (ParseResult<T>)_create.Invoke(null, BindingFlags.DoNotWrapExceptions, null, arguments, null)!;

        return result.IsSuccess ? result.Value : throw new JsonException(result.Error);
    }

    public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions options)
    {
        Console.WriteLine($"[ObjectVO<{typeof(T).Name}>] Write");
        writer.WriteStartObject();

        foreach (var part in _parts)
        {
            writer.WritePropertyName(part.EncodedName);
            part.Write(writer, value, options);
        }

        writer.WriteEndObject();
    }

    private abstract class Part(string name)
    {
        public string Name { get; } = name;
        public JsonEncodedText EncodedName { get; } = JsonEncodedText.Encode(name);

        // What Create receives when the JSON does not carry the part: its declared default, or the type's own.
        public abstract object? Absent { get; }

        public abstract object? Read(ref Utf8JsonReader reader, JsonSerializerOptions options);

        public abstract void Write(Utf8JsonWriter writer, T owner, JsonSerializerOptions options);

        public static Part For(Type owner, ParameterInfo parameter, JsonSerializerOptions options)
        {
            var property = owner.GetProperty(parameter.Name!, BindingFlags.Public | BindingFlags.Instance | BindingFlags.IgnoreCase)
                ?? throw new InvalidOperationException($"{owner.Name} must expose a property named like its Create parameter '{parameter.Name}'.");
            var name = options.PropertyNamingPolicy?.ConvertName(property.Name) ?? property.Name;

            return (Part)Activator.CreateInstance(typeof(Part<,>).MakeGenericType(typeof(T), parameter.ParameterType, property.PropertyType), name, property, parameter)!;
        }
    }

    // Read is typed by the Create parameter, Write by the property: they may differ (int? in, int out).
    private sealed class Part<TParameter, TProperty> : Part
    {
        private readonly Func<T, TProperty> _get;
        private JsonTypeInfo<TParameter>? _readInfo;
        private JsonTypeInfo<TProperty>? _writeInfo;

        public Part(string name, PropertyInfo property, ParameterInfo parameter)
            : base(name)
        {
            _get = property.GetMethod!.CreateDelegate<Func<T, TProperty>>();
            Absent = parameter.HasDefaultValue ? parameter.DefaultValue : default(TParameter);
            Console.WriteLine($"[ObjectVO<{typeof(T).Name}>] parte '{name}': le {typeof(TParameter).Name}, escreve {typeof(TProperty).Name}");
        }

        public override object? Absent { get; }

        // Resolved on first use: asking the options for a type info while they are still being built is too early.
        public override object? Read(ref Utf8JsonReader reader, JsonSerializerOptions options)
        {
            _readInfo ??= (JsonTypeInfo<TParameter>)options.GetTypeInfo(typeof(TParameter));

            return JsonSerializer.Deserialize(ref reader, _readInfo);
        }

        public override void Write(Utf8JsonWriter writer, T owner, JsonSerializerOptions options)
        {
            _writeInfo ??= (JsonTypeInfo<TProperty>)options.GetTypeInfo(typeof(TProperty));
            JsonSerializer.Serialize(writer, _get(owner), _writeInfo);
        }
    }
}
