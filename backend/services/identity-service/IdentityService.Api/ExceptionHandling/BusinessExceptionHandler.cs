using IdentityService.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace IdentityService.Api.ExceptionHandling;

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

        var problemDetails = new ProblemDetails
        {
            Status = StatusCodes.Status400BadRequest,
            Title = businessException.Code,
            Detail = businessException.Message,
        };
        // Also expose Code as its own field, not just folded into Title -
        // matches every other error path (Result-based Conflict/NotFound/
        // Forbidden, validation errors) so callers can rely on `code` alone.
        problemDetails.Extensions["code"] = businessException.Code;

        httpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
        await httpContext.Response.WriteAsJsonAsync(
            problemDetails,
            options: null,
            contentType: "application/problem+json",
            cancellationToken);

        return true;
    }
}
