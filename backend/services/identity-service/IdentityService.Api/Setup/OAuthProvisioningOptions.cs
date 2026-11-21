using OpenIddict.Abstractions;

namespace IdentityService.Api.Setup;

public sealed class OAuthProvisioningOptions
{
    public const string SectionName = "OAuth";
    public List<OAuthScopeDefinition> Scopes { get; set; } = [];
    public List<OAuthClientDefinition> Clients { get; set; } = [];

    public IReadOnlyList<string> Validate(IConfiguration configuration)
    {
        var errors = new List<string>();
        var scopes = Scopes.Select(scope => scope.Name).ToHashSet(StringComparer.Ordinal);
        if (Scopes.Count == 0 || scopes.Count != Scopes.Count || scopes.Any(string.IsNullOrWhiteSpace))
        {
            errors.Add("Os escopos OAuth devem ter nomes únicos e não vazios.");
        }

        if (Scopes.SelectMany(scope => scope.Resources).Any(resource => string.IsNullOrWhiteSpace(resource)))
        {
            errors.Add("Os recursos OAuth devem ter identificadores não vazios.");
        }

        if (Clients.Select(client => client.ClientId).Distinct(StringComparer.Ordinal).Count() != Clients.Count)
        {
            errors.Add("Os clientes OAuth devem ter identificadores únicos.");
        }

        foreach (var client in Clients)
        {
            if (string.IsNullOrWhiteSpace(client.ClientId)
                || client.Scopes.Count == 0 || client.Scopes.Any(scope => !scopes.Contains(scope))
                || client.Resources.Count == 0
                || client.Resources.Any(resource => !Scopes.Any(scope => client.Scopes.Contains(scope.Name)
                    && scope.Resources.Contains(resource, StringComparer.Ordinal))))
            {
                errors.Add("Cada cliente deve declarar identidade, escopos e recursos cadastrados compatíveis.");
            }

            if (client.GrantTypes.Contains(OpenIddictConstants.GrantTypes.AuthorizationCode))
            {
                if (client.ClientType != OpenIddictConstants.ClientTypes.Public
                    || client.ConsentType != OpenIddictConstants.ConsentTypes.Implicit
                    || client.RedirectUris.Count == 0 || client.SecretConfigurationKey is not null
                    || client.GrantTypes.Any(grant => grant is not ("authorization_code" or "refresh_token"))
                    || (client.Scopes.Contains("offline_access") && !client.GrantTypes.Contains("refresh_token")))
                {
                    errors.Add("O cliente interativo deve ser público, ter callbacks e confiança explícita para autorização automática.");
                }
            }
            else if (client.ClientType != OpenIddictConstants.ClientTypes.Confidential
                || client.GrantTypes.Count != 1 || client.GrantTypes[0] != OpenIddictConstants.GrantTypes.ClientCredentials
                || string.IsNullOrWhiteSpace(client.SecretConfigurationKey)
                || string.IsNullOrWhiteSpace(configuration[client.SecretConfigurationKey])
                || client.RedirectUris.Count != 0 || client.PostLogoutRedirectUris.Count != 0
                || client.Scopes.Any(scope => scope is "openid" or "offline_access"))
            {
                errors.Add("O cliente de serviço deve ser confidencial, usar client_credentials e ter segredo configurado.");
            }

            if (client.ApplicationType is not ("web" or "native")
                || client.RedirectUris.Concat(client.PostLogoutRedirectUris).Any(value => !IsValidCallback(value)))
            {
                errors.Add("Os callbacks devem usar HTTPS ou HTTP de loopback para clientes nativos ou desenvolvimento.");
            }
        }

        return errors;
    }

    private static bool IsValidCallback(string value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)
            || !string.IsNullOrEmpty(uri.UserInfo) || !string.IsNullOrEmpty(uri.Fragment))
        {
            return false;
        }

        return uri.Scheme == Uri.UriSchemeHttps || (uri.Scheme == Uri.UriSchemeHttp && uri.IsLoopback);
    }
}

public sealed class OAuthScopeDefinition
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public List<string> Resources { get; set; } = [];
}

public sealed class OAuthClientDefinition
{
    public string ClientId { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string ClientType { get; set; } = string.Empty;
    public string ApplicationType { get; set; } = "web";
    public string ConsentType { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public string? SecretConfigurationKey { get; set; }
    public List<string> GrantTypes { get; set; } = [];
    public List<string> Scopes { get; set; } = [];
    public List<string> Resources { get; set; } = [];
    public List<string> RedirectUris { get; set; } = [];
    public List<string> PostLogoutRedirectUris { get; set; } = [];

    public OpenIddictApplicationDescriptor ToDescriptor(IConfiguration configuration)
    {
        var descriptor = new OpenIddictApplicationDescriptor
        {
            ClientId = ClientId,
            DisplayName = DisplayName,
            ClientType = ClientType,
            ApplicationType = ApplicationType,
            ClientSecret = SecretConfigurationKey is null ? null : configuration[SecretConfigurationKey],
        };
        if (!string.IsNullOrWhiteSpace(ConsentType))
        {
            descriptor.ConsentType = ConsentType;
        }

        descriptor.RedirectUris.UnionWith(RedirectUris.Select(value => new Uri(value)));
        descriptor.PostLogoutRedirectUris.UnionWith(PostLogoutRedirectUris.Select(value => new Uri(value)));
        if (!Enabled)
        {
            return descriptor;
        }

        descriptor.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.Token);
        descriptor.AddGrantTypePermissions(GrantTypes.ToArray());
        descriptor.AddScopePermissions(Scopes.ToArray());
        descriptor.AddResourcePermissions(Resources.ToArray());
        if (GrantTypes.Contains(OpenIddictConstants.GrantTypes.AuthorizationCode))
        {
            descriptor.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.Authorization);
            descriptor.Permissions.Add(OpenIddictConstants.Permissions.ResponseTypes.Code);
            descriptor.Requirements.Add(OpenIddictConstants.Requirements.Features.ProofKeyForCodeExchange);
        }

        if (PostLogoutRedirectUris.Count > 0)
        {
            descriptor.Permissions.Add(OpenIddictConstants.Permissions.Endpoints.EndSession);
        }

        return descriptor;
    }
}
