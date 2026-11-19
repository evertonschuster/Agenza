using OpenIddict.Abstractions;

namespace IdentityService.Api.Setup;

public static class McpClientDescriptor
{
    public static OpenIddictApplicationDescriptor Create(
        string clientId,
        string displayName,
        string applicationType,
        string resource,
        IEnumerable<Uri> redirectUris)
    {
        var descriptor = new OpenIddictApplicationDescriptor
        {
            ClientId = clientId,
            DisplayName = displayName,
            ApplicationType = applicationType,
            ClientType = OpenIddictConstants.ClientTypes.Public,
            ConsentType = OpenIddictConstants.ConsentTypes.Implicit,
            Permissions =
            {
                OpenIddictConstants.Permissions.Endpoints.Authorization,
                OpenIddictConstants.Permissions.Endpoints.Token,
                OpenIddictConstants.Permissions.GrantTypes.AuthorizationCode,
                OpenIddictConstants.Permissions.GrantTypes.RefreshToken,
                OpenIddictConstants.Permissions.ResponseTypes.Code,
                OpenIddictConstants.Permissions.Scopes.Profile,
                OpenIddictConstants.Permissions.Prefixes.Scope + "tenant_id",
                OpenIddictConstants.Permissions.Prefixes.Scope + "mcp:connect",
                OpenIddictConstants.Permissions.Prefixes.Scope + OpenIddictConstants.Scopes.OfflineAccess,
            },
            Requirements = { OpenIddictConstants.Requirements.Features.ProofKeyForCodeExchange },
        };
        descriptor.AddResourcePermissions(resource);
        descriptor.RedirectUris.UnionWith(redirectUris);
        return descriptor;
    }
}
