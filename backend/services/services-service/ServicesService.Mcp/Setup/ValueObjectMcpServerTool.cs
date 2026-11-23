using System.Reflection;
using System.Text.Json;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using Admin.SharedKernel;
using ServicesService.Mcp.Extensions;

namespace ServicesService.Mcp.Setup;

internal sealed class ValueObjectMcpServerTool(
    McpServerTool inner,
    MethodInfo method,
    JsonSerializerOptions serializerOptions) : McpServerTool
{
    public override Tool ProtocolTool => inner.ProtocolTool;

    public override IReadOnlyList<object> Metadata => inner.Metadata;

    public override async ValueTask<CallToolResult> InvokeAsync(
        RequestContext<CallToolRequestParams> request, CancellationToken cancellationToken = default)
    {
        try
        {
            return await inner.InvokeAsync(request, cancellationToken);
        }
        catch (JsonException)
        {
            // O SDK desserializa argumentos isoladamente, sem o nome do parâmetro no caminho do erro.
            var error = FindArgumentError(request.Params?.Arguments);
            if (error is { } validationError)
            {
                return validationError.ToToolResult();
            }

            throw;
        }
    }

    private Error? FindArgumentError(IDictionary<string, JsonElement>? arguments)
    {
        if (arguments is null)
        {
            return null;
        }

        foreach (var parameter in method.GetParameters())
        {
            if (parameter.Name is not { } name || !arguments.TryGetValue(name, out var argument)
                || !ProtocolTool.InputSchema.GetProperty("properties").TryGetProperty(name, out _))
            {
                continue;
            }

            try
            {
                argument.Deserialize(parameter.ParameterType, serializerOptions);
            }
            catch (JsonException exception)
            {
                var field = name;
                if (exception.Path is { Length: > 2 } path && path.StartsWith("$.", StringComparison.Ordinal))
                {
                    field += path[1..];
                }

                return Error.Validation("Validation.Failed", exception.Message,
                    new Dictionary<string, IReadOnlyList<FieldError>>
                    {
                        [field] = [new FieldError("Validation.Failed", exception.Message)],
                    });
            }
        }

        return null;
    }
}
