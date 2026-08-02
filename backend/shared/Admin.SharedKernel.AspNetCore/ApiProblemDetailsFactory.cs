using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;

namespace Admin.SharedKernel.AspNetCore;

public static class ApiProblemDetailsFactory
{
    private const string ValidationProblemType = "https://agenza/errors/validation";
    private const string ApplicationProblemType = "https://agenza/errors/application";
    private const string AuthorizationProblemType = "https://agenza/errors/authorization";
    private const string UnexpectedProblemType = "https://agenza/errors/unexpected";
    private const string CorrelationIdHeaderName = "X-Correlation-Id";

    public static ApiProblemDetails CreateValidationProblem(Error error, HttpContext? httpContext = null)
    {
        return CreateProblem(httpContext, ValidationProblemType, "Ocorreram erros de validação.", StatusCodes.Status400BadRequest, error.Code, error.FieldErrors ?? EmptyErrors);
    }

    public static ApiProblemDetails CreateApplicationProblem(Error error, HttpContext? httpContext = null)
    {
        return CreateProblem(
            httpContext,
            ApplicationProblemType,
            error.Message,
            error.Type.ToHttpStatusCode(),
            error.Code,
            error.FieldErrors is null ? CreateSingleErrorDictionary(error) : error.FieldErrors);
    }

    public static ApiProblemDetails CreateAuthorizationProblem(bool forbidden, HttpContext? httpContext = null)
    {
        return CreateProblem(
            httpContext,
            AuthorizationProblemType,
            forbidden ? "Acesso negado." : "Autenticação obrigatória.",
            forbidden ? StatusCodes.Status403Forbidden : StatusCodes.Status401Unauthorized,
            forbidden ? "Authorization.Forbidden" : "Authorization.Unauthorized",
            EmptyErrors);
    }

    public static ApiProblemDetails CreateUnexpectedProblem(HttpContext? httpContext = null)
    {
        return CreateProblem(
            httpContext,
            UnexpectedProblemType,
            "Ocorreu um erro inesperado.",
            StatusCodes.Status500InternalServerError,
            "Unexpected.Error",
            EmptyErrors);
    }

    private static ApiProblemDetails CreateProblem(
        HttpContext? httpContext,
        string type,
        string title,
        int status,
        string? code,
        IReadOnlyDictionary<string, IReadOnlyList<FieldError>> errors)
    {
        return new ApiProblemDetails
        {
            Type = type,
            Title = title,
            Status = status,
            Code = code,
            TraceId = httpContext?.TraceIdentifier,
            CorrelationId = ResolveCorrelationId(httpContext),
            Errors = errors,
        };
    }

    private static string? ResolveCorrelationId(HttpContext? httpContext)
    {
        if (httpContext is null)
        {
            return null;
        }

        if (httpContext.Request.Headers.TryGetValue(CorrelationIdHeaderName, out var correlationId) && !StringValues.IsNullOrEmpty(correlationId))
        {
            return correlationId.ToString();
        }

        return httpContext.TraceIdentifier;
    }

    private static IReadOnlyDictionary<string, IReadOnlyList<FieldError>> CreateSingleErrorDictionary(Error error) =>
        new Dictionary<string, IReadOnlyList<FieldError>>
        {
            [string.Empty] = [new FieldError(error.Code, error.Message)],
        };

    private static readonly IReadOnlyDictionary<string, IReadOnlyList<FieldError>> EmptyErrors =
        new Dictionary<string, IReadOnlyList<FieldError>>();
}
