using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Admin.SharedKernel.AspNetCore;

public static class ResultExtensions
{
    private const string ValidationProblemType = "https://agenza/errors/validation";

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
        return result.IsSuccess ? onSuccess() : ToProblemResult(result.Error);
    }

    public static IActionResult ToActionResult<TValue>(
        this Result<TValue> result,
        ControllerBase controller,
        Func<TValue, IActionResult> onSuccess)
    {
        return result.IsSuccess ? onSuccess(result.Value) : ToProblemResult(result.Error);
    }

    private static IActionResult ToProblemResult(Error error)
    {
        if (error.Type == ErrorType.Validation && error.FieldErrors is not null)
        {
            var validationProblem = new ApiProblemDetails
            {
                Type = ValidationProblemType,
                Title = "Ocorreram erros de validação.",
                Status = StatusCodes.Status400BadRequest,
                Code = error.Code,
                Errors = error.FieldErrors,
            };

            return new ObjectResult(validationProblem) { StatusCode = validationProblem.Status };
        }

        var problem = new ApiProblemDetails
        {
            Type = "https://agenza/errors/application",
            Title = error.Message,
            Status = error.Type.ToHttpStatusCode(),
            Code = error.Code,
        };

        return new ObjectResult(problem) { StatusCode = problem.Status };
    }
}
