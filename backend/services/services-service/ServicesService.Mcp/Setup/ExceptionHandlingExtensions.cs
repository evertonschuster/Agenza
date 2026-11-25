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
                return BindingError.From(exception, context).ToToolResult();
            }
            catch (ArgumentException exception)
            {
                // The SDK reports a missing argument with its generic "arguments" parameter name, which says nothing.
                var message = string.IsNullOrWhiteSpace(exception.ParamName) || exception.ParamName == "arguments"
                    ? "Argumento inválido ou ausente."
                    : $"Argumento inválido ou ausente: {Clean(exception.ParamName)}.";
                return ReportFailure(context, exception, Error.Validation("Validation.Failed", message), LogLevel.Warning);
            }
            catch (McpException)
            {
                throw;
            }
            catch (InputRequiredException)
            {
                throw;
            }
            catch (Exception exception) when (exception is TimeoutException
                || (exception is OperationCanceledException && !cancellationToken.IsCancellationRequested))
            {
                return ReportFailure(context, exception, Error.Failure("Operation.Timeout", "A operação excedeu o tempo limite. Tente novamente; se persistir, use menos dados na chamada, como uma página menor ou filtros mais específicos."));
            }
            catch (Exception exception) when (!(exception is OperationCanceledException && cancellationToken.IsCancellationRequested))
            {
                return ReportFailure(context, exception, Error.Failure("Unexpected.Error", "Ocorreu um erro inesperado."));
            }
        }));
    }

    private static CallToolResult ReportFailure(RequestContext<CallToolRequestParams> context, Exception exception, Error error,
        LogLevel level = LogLevel.Error)
    {
        var services = context.Services!;
        var httpContext = services.GetRequiredService<IHttpContextAccessor>().HttpContext;
        var traceId = Clean(httpContext?.TraceIdentifier ?? Activity.Current?.TraceId.ToString() ?? Guid.NewGuid().ToString("N"));
        var correlationId = httpContext?.Request.Headers["X-Correlation-Id"].ToString();
        correlationId = string.IsNullOrWhiteSpace(correlationId) ? traceId : Clean(correlationId[..Math.Min(correlationId.Length, 64)]);
        var logger = services.GetRequiredService<ILoggerFactory>().CreateLogger("ServicesService.Mcp.Tools");
        logger.Log(level, exception,
            "Failed invoking MCP tool {ToolName} with TraceId {TraceId} and CorrelationId {CorrelationId}",
            Clean(context.Params?.Name), traceId, correlationId);

        return error.ToToolResult(traceId, correlationId);
    }

    private static string? Clean(string? value) =>
        value is null ? null : string.Concat(value.Select(character => char.IsControl(character) ? '_' : character));
}
