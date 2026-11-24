using System.Diagnostics;
using System.Text.Json;
using Admin.SharedKernel;
using ModelContextProtocol;
using ModelContextProtocol.Protocol;
using ModelContextProtocol.Server;
using ServicesService.Mcp.Extensions;

namespace ServicesService.Mcp.Setup;

public static class ExceptionHandlingExtensions
{
    public static IMcpServerBuilder WithToolExceptionHandling(this IMcpServerBuilder builder)
    {
        builder.Services.AddHttpContextAccessor();
        return builder.WithRequestFilters(filters => filters.AddCallToolFilter(next => async (context, cancellationToken) =>
        {
            try
            {
                return await next(context, cancellationToken);
            }
            catch (JsonException exception)
            {
                const string code = "Validation.Failed";
                var error = string.IsNullOrWhiteSpace(exception.Path) || exception.Path == "$"
                    ? Error.Validation(code, exception.Message)
                    : Error.Validation(code, exception.Message, new Dictionary<string, IReadOnlyList<FieldError>>
                    {
                        [exception.Path] = [new FieldError(code, exception.Message)],
                    });
                return error.ToToolResult();
            }
            catch (Exception exception) when (!(exception is OperationCanceledException && cancellationToken.IsCancellationRequested))
            {
                var services = context.Services!;
                var httpContext = services.GetRequiredService<IHttpContextAccessor>().HttpContext;
                var traceId = Clean(httpContext?.TraceIdentifier ?? Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString("N"));
                var correlationId = httpContext?.Request.Headers["X-Correlation-Id"].ToString();
                correlationId = string.IsNullOrWhiteSpace(correlationId) ? traceId : Clean(correlationId);
                var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("ServicesService.Mcp.Tools");
                logger.LogError(exception,
                    "Unhandled exception invoking MCP tool {ToolName} with TraceId {TraceId} and CorrelationId {CorrelationId}",
                    Clean(context.Params?.Name), traceId, correlationId);

                return Error.Failure("Unexpected.Error", "Ocorreu um erro inesperado.").ToToolResult(traceId, correlationId);
            }
        }));
    }

    private static string? Clean(string? value) =>
        value is null ? null : string.Concat(value.Select(character => char.IsControl(character) ? '_' : character));
}
