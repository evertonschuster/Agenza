using System.Collections.Immutable;
using System.Security.Claims;
using Admin.SharedKernel;
using OpenIddict.Abstractions;

namespace IdentityService.Api.Setup;

public sealed record OAuthGrant(string[] Scopes, string[] Resources);

public sealed class OAuthGrantPolicy(
    IOpenIddictApplicationManager applications,
    IOpenIddictScopeManager scopeManager)
{
    public async Task<Result<OAuthGrant>> ResolveAsync(
        string clientId,
        IEnumerable<string> requestedScopes,
        IEnumerable<string> requestedResources,
        ClaimsPrincipal? previousGrant,
        bool requireAutomaticConsent,
        CancellationToken cancellationToken)
    {
        var application = await applications.FindByClientIdAsync(clientId, cancellationToken);
        if (application is null)
        {
            return Failure(OpenIddictConstants.Errors.InvalidClient);
        }

        var permissions = await applications.GetPermissionsAsync(application, cancellationToken);
        if (!permissions.Contains(OpenIddictConstants.Permissions.Endpoints.Token))
        {
            return Failure(OpenIddictConstants.Errors.UnauthorizedClient);
        }

        if (requireAutomaticConsent
            && await applications.GetConsentTypeAsync(application, cancellationToken) != OpenIddictConstants.ConsentTypes.Implicit)
        {
            return Failure(OpenIddictConstants.Errors.ConsentRequired);
        }

        var scopes = requestedScopes.Distinct(StringComparer.Ordinal).ToArray();
        var allowedScopes = permissions.Where(permission => permission.StartsWith(OpenIddictConstants.Permissions.Prefixes.Scope, StringComparison.Ordinal))
            .Select(permission => permission[OpenIddictConstants.Permissions.Prefixes.Scope.Length..]).ToHashSet(StringComparer.Ordinal);
        var allowedResources = permissions.Where(permission => permission.StartsWith(OpenIddictConstants.Permissions.Prefixes.Resource, StringComparison.Ordinal))
            .Select(permission => permission[OpenIddictConstants.Permissions.Prefixes.Resource.Length..]).ToHashSet(StringComparer.Ordinal);
        if (previousGrant is null)
        {
            if (scopes.Any(scope => !allowedScopes.Contains(scope)))
            {
                return Failure(OpenIddictConstants.Errors.InvalidScope);
            }
        }
        else
        {
            var originalScopes = previousGrant.GetScopes();
            if (scopes.Any(scope => !originalScopes.Contains(scope, StringComparer.Ordinal)))
            {
                return Failure(OpenIddictConstants.Errors.InvalidScope);
            }

            if (scopes.Length == 0)
            {
                scopes = originalScopes.ToArray();
            }

            scopes = scopes.Where(allowedScopes.Contains).ToArray();
        }

        var resources = await scopeManager.ListResourcesAsync(scopes.ToImmutableArray(), cancellationToken).ToListAsync(cancellationToken);
        resources = resources.Where(allowedResources.Contains).ToList();
        if (previousGrant is not null)
        {
            var originalResources = previousGrant.GetResources();
            resources = resources.Where(resource => originalResources.Contains(resource, StringComparer.Ordinal)).ToList();
            if (originalResources.Length > 0 && resources.Count == 0)
            {
                return Failure(OpenIddictConstants.Errors.InvalidGrant);
            }
        }

        var targets = requestedResources.Distinct(StringComparer.Ordinal).ToArray();
        if (targets.Any(resource => !resources.Contains(resource, StringComparer.Ordinal)))
        {
            return Failure(OpenIddictConstants.Errors.InvalidTarget);
        }

        if (targets.Length > 0)
        {
            resources = resources.Where(resource => targets.Contains(resource, StringComparer.Ordinal)).ToList();
        }

        return Result.Success(new OAuthGrant(scopes, resources.ToArray()));
    }

    private static Result<OAuthGrant> Failure(string code)
    {
        return Result.Failure<OAuthGrant>(Error.Forbidden(code, "O cliente não tem autorização para esta concessão OAuth."));
    }
}
