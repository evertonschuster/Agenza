using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Admin.SharedKernel;

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
        return result.IsSuccess
            ? onSuccess()
            : controller.Problem(title: result.Error.Message, statusCode: result.Error.Type.ToHttpStatusCode());
    }

    public static IActionResult ToActionResult<TValue>(
        this Result<TValue> result,
        ControllerBase controller,
        Func<TValue, IActionResult> onSuccess)
    {
        return result.IsSuccess
            ? onSuccess(result.Value)
            : controller.Problem(title: result.Error.Message, statusCode: result.Error.Type.ToHttpStatusCode());
    }
}
