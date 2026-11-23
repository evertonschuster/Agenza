using System.Reflection;
using System.Text.Json;
using System.Text.RegularExpressions;
using Admin.SharedKernel;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Mcp.Extensions;

namespace ServicesService.Mcp.Setup;

// O SDK perde o nome do argumento quando o conversor de um VO falha e responde com um erro genérico.
// Validar antes de delegar devolve todos os campos inválidos de uma vez, com a mensagem do próprio VO.
internal sealed partial class ValueObjectMcpServerTool : McpServerTool
{
    private const string Code = "Validation.Failed";
    private const string RequiredMessage = "Informe este campo obrigatório.";
    private const string InvalidMessage = "O valor informado é inválido para este campo.";
    private const string Summary = "Alguns campos são inválidos. Corrija-os conforme fieldErrors e envie a chamada novamente.";

    private readonly McpServerTool inner;
    private readonly JsonSerializerOptions options;
    private readonly Argument[] arguments;

    public ValueObjectMcpServerTool(McpServerTool inner, MethodInfo method, JsonSerializerOptions options)
    {
        this.inner = inner;
        this.options = options;
        var names = inner.ProtocolTool.InputSchema.GetProperty("properties").EnumerateObject().Select(property => property.Name).ToHashSet();
        var nullability = new NullabilityInfoContext();
        arguments = [.. method.GetParameters()
            .Where(parameter => names.Contains(parameter.Name!))
            .Select(parameter => new Argument(parameter, nullability.Create(parameter).ReadState != NullabilityState.NotNull))];
    }

    public override Tool ProtocolTool => inner.ProtocolTool;

    public override IReadOnlyList<object> Metadata => inner.Metadata;

    public override ValueTask<CallToolResult> InvokeAsync(
        RequestContext<CallToolRequestParams> request, CancellationToken cancellationToken = default)
    {
        var errors = Validate(request.Params?.Arguments);
        if (errors.Count == 0)
        {
            return inner.InvokeAsync(request, cancellationToken);
        }

        var fieldErrors = errors.ToDictionary(
            error => error.Field,
            error => (IReadOnlyList<FieldError>)[new FieldError(Code, error.Message)]);
        return ValueTask.FromResult(Error.Validation(Code, Summary, fieldErrors).ToToolResult());
    }

    private List<(string Field, string Message)> Validate(IDictionary<string, JsonElement>? values)
    {
        var errors = new List<(string, string)>();
        foreach (var (parameter, nullable) in arguments)
        {
            var name = parameter.Name!;
            if (values is null || !values.TryGetValue(name, out var json))
            {
                if (!parameter.HasDefaultValue)
                {
                    errors.Add((name, RequiredMessage));
                }

                continue;
            }

            try
            {
                if (json.Deserialize(parameter.ParameterType, options) is null && !nullable)
                {
                    errors.Add((name, RequiredMessage));
                }
            }
            catch (JsonException exception)
            {
                var message = exception is ValueObjectJsonException ? exception.Message : Expected(parameter.ParameterType, exception.Path);
                errors.Add((Field(name, exception.Path), message));
            }
        }

        return errors;
    }

    // The framework error carries no type and its text is English, so the hint comes from the type at the failing path.
    // It never echoes the received value.
    private string Expected(Type root, string? path)
    {
        var type = TypeAt(root, path);
        type = Nullable.GetUnderlyingType(type) ?? type;
        if (type.IsEnum)
        {
            return "Use um destes valores: " + string.Join(", ", Enum.GetNames(type).Select(JsonNamingPolicy.CamelCase.ConvertName)) + ".";
        }

        return Type.GetTypeCode(type) switch
        {
            TypeCode.Boolean => "Informe verdadeiro ou falso.",
            TypeCode.Byte or TypeCode.Int16 or TypeCode.Int32 or TypeCode.Int64 or TypeCode.UInt16 or TypeCode.UInt32 or TypeCode.UInt64
                => "Informe um número inteiro.",
            TypeCode.Single or TypeCode.Double or TypeCode.Decimal => "Informe um número.",
            TypeCode.String => "Informe um texto.",
            _ when type == typeof(DateOnly) => "Informe uma data no formato AAAA-MM-DD.",
            _ => InvalidMessage,
        };
    }

    private Type TypeAt(Type type, string? path)
    {
        foreach (var segment in PathSegments().Matches(path ?? string.Empty).Select(match => match.Value))
        {
            if (segment[0] == '.')
            {
                var property = options.GetTypeInfo(type).Properties.FirstOrDefault(item => item.Name == segment[1..]);
                type = property?.PropertyType ?? typeof(object);
                continue;
            }

            type = ElementType(type) ?? typeof(object);
        }

        return type;
    }

    private static Type? ElementType(Type type)
    {
        if (type.IsArray)
        {
            return type.GetElementType();
        }

        return type.GetInterfaces().Append(type)
            .FirstOrDefault(item => item.IsGenericType && item.GetGenericTypeDefinition() == typeof(IEnumerable<>))
            ?.GetGenericArguments()[0];
    }

    [GeneratedRegex(@"\.[^.\[]+|\[\d+\]")]
    private static partial Regex PathSegments();

    private static string Field(string name, string? path) =>
        path is { Length: > 1 } && path[0] == '$' ? name + path[1..] : name;

    private sealed record Argument(ParameterInfo Parameter, bool Nullable);
}
