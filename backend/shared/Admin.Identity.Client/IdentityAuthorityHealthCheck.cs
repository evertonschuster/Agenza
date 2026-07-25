using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Admin.Identity.Client;

public sealed class IdentityAuthorityHealthCheck(IHttpClientFactory httpClientFactory)
    : IHealthCheck
{
    public const string HttpClientName = "identity-readiness";

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            using var client = httpClientFactory.CreateClient(HttpClientName);
            using var response = await client.GetAsync(
                ".well-known/openid-configuration",
                cancellationToken);

            return response.IsSuccessStatusCode
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy(
                    $"Identity discovery returned HTTP {(int)response.StatusCode}.");
        }
        catch (HttpRequestException exception)
        {
            return HealthCheckResult.Unhealthy(
                "Identity discovery is unreachable.",
                exception);
        }
    }
}
