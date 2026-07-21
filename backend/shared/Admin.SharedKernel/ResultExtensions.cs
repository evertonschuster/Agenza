using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Admin.SharedKernel;

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
        return result.IsSuccess ? onSuccess() : ToProblemResult(result.Error, controller);
    }

    public static IActionResult ToActionResult<TValue>(
        this Result<TValue> result,
        ControllerBase controller,
        Func<TValue, IActionResult> onSuccess)
    {
        return result.IsSuccess ? onSuccess(result.Value) : ToProblemResult(result.Error, controller);
    }

    private static IActionResult ToProblemResult(Error error, ControllerBase controller)
    {
        if (error.Type != ErrorType.Validation || error.FieldErrors is null)
        {
            return controller.Problem(title: error.Message, statusCode: error.Type.ToHttpStatusCode());
        }

        // Field/code/message preserved per-error instead of one joined string
        // (docs/adr/0013) - the front-end maps errors to fields without parsing
        // free text out of a single title.
        var problemDetails = new ProblemDetails
        {
            Type = ValidationProblemType,
            Title = "Ocorreram erros de validação.",
            Status = StatusCodes.Status400BadRequest,
        };
        problemDetails.Extensions["code"] = error.Code;
        problemDetails.Extensions["errors"] = error.FieldErrors;

        return new ObjectResult(problemDetails) { StatusCode = problemDetails.Status };
    }
}
