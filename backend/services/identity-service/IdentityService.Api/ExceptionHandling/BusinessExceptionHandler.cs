using IdentityService.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace IdentityService.Api.ExceptionHandling;

/// <summary>
/// Catches a BusinessException that escapes a command/query handler
/// (docs/adr/0006) and maps it to a 400 Problem Details response using
/// its Code/Message - replaces the try/catch each handler used to repeat
/// around domain construction. Anything else is left unhandled (returns
/// false) and still 500s: an exception that isn't a BusinessException
/// past this point is a real bug or infrastructure failure, not an
/// expected outcome.
/// </summary>
public class BusinessExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not BusinessException businessException)
        {
            return false;
        }

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        await httpContext.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = businessException.Code,
                Detail = businessException.Message,
            },
            cancellationToken);

        return true;
    }
}
