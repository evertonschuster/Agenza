using Microsoft.Net.Http.Headers;

namespace ServicesService.Mcp.Setup;

public static class ChallengeParametersExtensions
{
    // The MCP SDK emits only resource_metadata in the Bearer challenge. RFC 6750 asks for the scope the
    // resource needs, and error="invalid_token" when a token was sent but rejected, which is what lets a
    // client refresh or re-authorize instead of treating the 401 as a plain missing credential.
    public static IApplicationBuilder UseMcpChallengeParameters(this IApplicationBuilder app, string requiredScope)
    {
        return app.Use((context, next) =>
        {
            context.Response.OnStarting(() =>
            {
                if (context.Response.StatusCode == StatusCodes.Status401Unauthorized
                    && context.Response.Headers.WWWAuthenticate.ToString() is { Length: > 0 } challenge
                    && challenge.StartsWith("Bearer", StringComparison.OrdinalIgnoreCase)
                    && !challenge.Contains("scope=", StringComparison.Ordinal))
                {
                    var error = context.Request.Headers.ContainsKey(HeaderNames.Authorization)
                        ? ", error=\"invalid_token\""
                        : string.Empty;
                    context.Response.Headers.WWWAuthenticate = $"{challenge}{error}, scope=\"{requiredScope}\"";
                }

                return Task.CompletedTask;
            });

            return next(context);
        });
    }
}
