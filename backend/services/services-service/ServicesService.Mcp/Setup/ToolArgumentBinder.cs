using System.Reflection;
using System.Text.Json;
using Admin.SharedKernel;
using Microsoft.Extensions.AI;

namespace ServicesService.Mcp.Setup;

internal static class ToolArgumentBinder
{
    public static object? Bind(ParameterInfo parameter, string name, AIFunctionArguments arguments, JsonSerializerOptions options)
    {
        if (!arguments.TryGetValue(name, out var raw))
        {
            if (parameter.HasDefaultValue)
            {
                return parameter.DefaultValue;
            }

            throw Failure(name, "Informe este campo obrigatório.");
        }

        var nullable = new NullabilityInfoContext().Create(parameter).ReadState != NullabilityState.NotNull;
        try
        {
            var json = raw is JsonElement element ? element : JsonSerializer.SerializeToElement(raw, options);
            var value = json.Deserialize(parameter.ParameterType, options);
            if (value is null && !nullable)
            {
                throw Failure(name, "Informe este campo obrigatório.");
            }

            return value;
        }
        catch (ValueObjectJsonException exception)
        {
            throw Failure(Field(name, exception.Path), exception.Message);
        }
        catch (JsonException exception)
        {
            throw Failure(Field(name, exception.Path), "O valor informado é inválido para este campo.");
        }
    }

    private static string Field(string name, string? path)
    {
        if (path is { Length: > 1 } && path[0] == '$')
        {
            return name + path[1..];
        }

        return name;
    }

    private static BindingException Failure(string field, string message)
    {
        return new BindingException(Error.Validation("Validation.Failed", message,
            new Dictionary<string, IReadOnlyList<FieldError>>
            {
                [field] = [new FieldError("Validation.Failed", message)],
            }));
    }

    internal sealed class BindingException(Error error) : Exception(error.Message)
    {
        public Error Error { get; } = error;
    }
}
