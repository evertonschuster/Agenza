using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;
using Microsoft.AspNetCore.Http;

namespace Admin.SharedKernel.AspNetCore;

public sealed class ProblemDetailsAuthorizationMiddlewareResultHandler
    : IAuthorizationMiddlewareResultHandler
{
    public async Task HandleAsync(
        RequestDelegate next,
        HttpContext context,
        AuthorizationPolicy policy,
        PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Succeeded)
        {
            await next(context);
            return;
        }

        var forbidden = authorizeResult.Forbidden;
        var status = forbidden
            ? StatusCodes.Status403Forbidden
            : StatusCodes.Status401Unauthorized;

        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(
            new ApiProblemDetails
            {
                Type = "https://agenza/errors/authorization",
                Title = forbidden ? "Acesso negado." : "Autenticação obrigatória.",
                Status = status,
                Code = forbidden ? "Authorization.Forbidden" : "Authorization.Unauthorized",
            },
            options: null,
            contentType: "application/problem+json",
            context.RequestAborted);
    }
}
