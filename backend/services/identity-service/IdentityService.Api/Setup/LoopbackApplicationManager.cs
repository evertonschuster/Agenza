using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using OpenIddict.Abstractions;
using OpenIddict.Core;

namespace IdentityService.Api.Setup;

public sealed class LoopbackApplicationManager<TApplication>(
    IOpenIddictApplicationCache<TApplication> cache,
    ILogger<OpenIddictApplicationManager<TApplication>> logger,
    IOptionsMonitor<OpenIddictCoreOptions> options,
    IOpenIddictApplicationStore<TApplication> store)
    : OpenIddictApplicationManager<TApplication>(cache, logger, options, store) where TApplication : class
{
    public const string AllowAnyLoopbackRedirectPath = "allow_any_loopback_redirect_path";

    private static readonly Regex LoopbackUri = new(
        @"\Ahttp://127[.]0[.]0[.]1(?::[0-9]{1,5})?(?:/[^?#\\\x00-\x20]*)?\z",
        RegexOptions.CultureInvariant | RegexOptions.NonBacktracking);

    public override async ValueTask<bool> ValidateRedirectUriAsync(
        TApplication application, string uri, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(application);
        ArgumentException.ThrowIfNullOrEmpty(uri);

        var properties = await GetPropertiesAsync(application, cancellationToken);
        if (properties.TryGetValue(AllowAnyLoopbackRedirectPath, out var enabled)
            && enabled.ValueKind == JsonValueKind.True
            && await HasClientTypeAsync(application, OpenIddictConstants.ClientTypes.Public, cancellationToken)
            && await HasApplicationTypeAsync(application, OpenIddictConstants.ApplicationTypes.Native, cancellationToken)
            && await HasRequirementAsync(application,
                OpenIddictConstants.Requirements.Features.ProofKeyForCodeExchange, cancellationToken)
            && LoopbackUri.IsMatch(uri)
            && Uri.TryCreate(uri, UriKind.Absolute, out var callback)
            && callback.Port > 0)
        {
            return true;
        }

        return await base.ValidateRedirectUriAsync(application, uri, cancellationToken);
    }
}
