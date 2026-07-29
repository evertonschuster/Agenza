using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;

namespace Admin.SharedKernel.AspNetCore;

public static class ResultExtensions
{
    public static int ToHttpStatusCode(this ErrorType type) => type switch
    {
        ErrorType.Validation => StatusCodes.Status400BadRequest,
        ErrorType.NotFound => StatusCodes.Status404NotFound,
        ErrorType.Conflict => StatusCodes.Status409Conflict,
        ErrorType.Forbidden => StatusCodes.Status403Forbidden,
        ErrorType.Failure => StatusCodes.Status400BadRequest,
        _ => StatusCodes.Status400BadRequest,
    };

    public static IActionResult ToActionResult(
        this Result result,
        ControllerBase controller,
        Func<IActionResult> onSuccess)
    {
        return result.IsSuccess ? onSuccess() : ToProblemResult(controller, result.Error);
    }

    public static IActionResult ToActionResult<TValue>(
        this Result<TValue> result,
        ControllerBase controller,
        Func<TValue, IActionResult> onSuccess)
    {
        if (!result.IsSuccess)
        {
            return ToProblemResult(controller, result.Error);
        }

        var httpContext = controller.HttpContext;
        var envelope = new ApiResponse<TValue>
        {
            Data = result.Value,
            TraceId = httpContext.TraceIdentifier,
            CorrelationId = ResolveCorrelationId(httpContext),
        };

        var actionResult = onSuccess(result.Value);

        if (actionResult is ObjectResult objectResult)
        {
            objectResult.Value = envelope;
        }

        return actionResult;
    }

    private static IActionResult ToProblemResult(ControllerBase controller, Error error)
    {
        var httpContext = controller.HttpContext;

        if (error.Type == ErrorType.Validation)
        {
            return new ObjectResult(ApiProblemDetailsFactory.CreateValidationProblem(error, httpContext))
            {
                StatusCode = StatusCodes.Status400BadRequest,
            };
        }

        var problem = ApiProblemDetailsFactory.CreateApplicationProblem(error, httpContext);
        return new ObjectResult(problem) { StatusCode = problem.Status };
    }

    private static string? ResolveCorrelationId(HttpContext httpContext)
    {
        if (httpContext.Request.Headers.TryGetValue("X-Correlation-Id", out var correlationId) && !StringValues.IsNullOrEmpty(correlationId))
        {
            return correlationId.ToString();
        }

        return httpContext.TraceIdentifier;
    }
}
