using IdentityService.Api.Setup;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Abstractions;
using System.Text.Json.Serialization;
using Asp.Versioning;

namespace IdentityService.Api.Controllers;

[ApiController]
[ApiVersionNeutral]
[AllowAnonymous]
[Route("connect/register")]
public class McpRegistrationController(
    IOpenIddictApplicationManager applicationManager,
    IConfiguration configuration) : ControllerBase
{
    private static readonly string[] AllowedScopes = ["openid", "profile", "tenant_id", "mcp:connect", "offline_access"];

    [HttpPost]
    public async Task<IActionResult> Register(RegisterMcpClientRequest request, CancellationToken cancellationToken)
    {
        var resource = configuration["IdentityClients:Mcp:Resource"];
        if (string.IsNullOrWhiteSpace(resource))
        {
            return NotFound();
        }

        if (request.RedirectUris is not { Length: > 0 and <= 10 }
            || request.ClientName?.Length > 100
            || request.TokenEndpointAuthMethod is not (null or "none")
            || request.GrantTypes is { Length: 0 }
            || request.GrantTypes?.Any(grant => grant is not ("authorization_code" or "refresh_token")) == true
            || request.ResponseTypes is { Length: 0 }
            || request.ResponseTypes?.Any(type => type != "code") == true
            || request.Scope?.Split(' ', StringSplitOptions.RemoveEmptyEntries).Except(AllowedScopes).Any() == true)
        {
            return RegistrationError("invalid_client_metadata", "Os metadados do cliente OAuth não são compatíveis com o MCP.");
        }

        var redirectUris = new List<Uri>();
        foreach (var value in request.RedirectUris)
        {
            if (value is null || value.Length > 2048
                || !Uri.TryCreate(value, UriKind.Absolute, out var uri)
                || !string.IsNullOrEmpty(uri.Fragment)
                || !string.IsNullOrEmpty(uri.UserInfo)
                || (uri.Scheme != Uri.UriSchemeHttps
                    && !(uri.Scheme == Uri.UriSchemeHttp && uri.IsLoopback)))
            {
                return RegistrationError("invalid_redirect_uri", "O retorno deve usar HTTPS ou HTTP no endereço de loopback do aplicativo local.");
            }

            redirectUris.Add(uri.Scheme == Uri.UriSchemeHttp ? new UriBuilder(uri) { Port = -1 }.Uri : uri);
        }

        var applicationType = redirectUris.Any(uri => uri.Scheme == Uri.UriSchemeHttp)
            ? OpenIddictConstants.ApplicationTypes.Native
            : OpenIddictConstants.ApplicationTypes.Web;
        var clientId = $"mcp-{Guid.NewGuid():N}";
        var displayName = string.IsNullOrWhiteSpace(request.ClientName) ? "Integração MCP" : request.ClientName;
        var descriptor = McpClientDescriptor.Create(clientId, displayName, applicationType, resource, redirectUris);
        await applicationManager.CreateAsync(descriptor, cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new
        {
            client_id = clientId,
            client_name = displayName,
            application_type = applicationType,
            redirect_uris = descriptor.RedirectUris.Select(uri => uri.AbsoluteUri).ToArray(),
            token_endpoint_auth_method = "none",
            grant_types = new[] { "authorization_code", "refresh_token" },
            response_types = new[] { "code" },
            scope = string.Join(' ', AllowedScopes),
        });
    }

    private BadRequestObjectResult RegistrationError(string error, string description) => BadRequest(new
    {
        error,
        error_description = description,
    });
}

public sealed record RegisterMcpClientRequest(
    [property: JsonPropertyName("redirect_uris")] string[]? RedirectUris,
    [property: JsonPropertyName("client_name")] string? ClientName,
    [property: JsonPropertyName("token_endpoint_auth_method")] string? TokenEndpointAuthMethod,
    [property: JsonPropertyName("grant_types")] string[]? GrantTypes,
    [property: JsonPropertyName("response_types")] string[]? ResponseTypes,
    [property: JsonPropertyName("scope")] string? Scope);
