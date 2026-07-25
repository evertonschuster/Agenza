using System.Net;
using Admin.Identity.Client;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;

namespace ServicesService.RuntimeTests;

internal sealed class ServicesApiFactory(string connectionString)
    : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder
            // Match the environment in which the OpenAPI contract is exposed
            // and consumed by CI. Production still does not map that endpoint.
            .UseEnvironment("Development")
            .UseSetting("ConnectionStrings:Default", connectionString)
            .UseSetting("DatabaseBootstrap:RunOnStartup", "true")
            .UseSetting("Identity:Authority", "https://identity.runtime-tests")
            .UseSetting("Identity:RequireHttpsMetadata", "false");

        builder.ConfigureTestServices(services =>
        {
            services.AddHttpClient(IdentityAuthorityHealthCheck.HttpClientName)
                .ConfigurePrimaryHttpMessageHandler(() => new HealthyIdentityHandler());
            services
                .AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = TestAuthenticationHandler.SchemeName;
                    options.DefaultChallengeScheme = TestAuthenticationHandler.SchemeName;
                    options.DefaultForbidScheme = TestAuthenticationHandler.SchemeName;
                })
                .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>(
                    TestAuthenticationHandler.SchemeName,
                    _ => { });
        });
    }

    private sealed class HealthyIdentityHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
    }
}
