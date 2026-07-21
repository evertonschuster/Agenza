using System.Security.Claims;
using IdentityService.Infrastructure.Identity;
using Microsoft.AspNetCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using OpenIddict.Abstractions;
using OpenIddict.Server.AspNetCore;

namespace IdentityService.Api.Controllers;

// OpenIddict handles the protocol machinery; this controller only decides *who* the resulting principal is for each grant type.
// admin-panel is a pre-approved first-party client (seeded in DatabaseSeeder), so there is no consent screen here.
public class AuthorizationController : Controller
{
    private readonly IOpenIddictScopeManager _scopeManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly UserManager<ApplicationUser> _userManager;

    public AuthorizationController(
        IOpenIddictScopeManager scopeManager,
        SignInManager<ApplicationUser> signInManager,
        UserManager<ApplicationUser> userManager)
    {
        _scopeManager = scopeManager;
        _signInManager = signInManager;
        _userManager = userManager;
    }

    [HttpGet("~/connect/authorize")]
    [HttpPost("~/connect/authorize")]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Authorize()
    {
        var request = HttpContext.GetOpenIddictServerRequest()
            ?? throw new InvalidOperationException("The OpenID Connect request cannot be retrieved.");

        var result = await HttpContext.AuthenticateAsync(IdentityConstants.ApplicationScheme);
        if (result is not { Succeeded: true })
        {
            return Challenge(
                authenticationSchemes: IdentityConstants.ApplicationScheme,
                properties: new AuthenticationProperties
                {
                    RedirectUri = Request.PathBase + Request.Path + QueryString.Create(
                        Request.HasFormContentType ? Request.Form.ToList() : Request.Query.ToList())
                });
        }

        // The cookie authenticated, but the user it points at may no longer exist
        // (deleted/locked after the cookie was issued) - an expected, if rare,
        // runtime condition, not a framework-impossible state, so it becomes a
        // protocol-level "please sign in again" response instead of a 500.
        var user = await _userManager.GetUserAsync(result.Principal);
        if (user is null)
        {
            return Forbid(
                authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
                properties: new AuthenticationProperties(new Dictionary<string, string?>
                {
                    [OpenIddictServerAspNetCoreConstants.Properties.Error] = OpenIddictConstants.Errors.LoginRequired,
                }));
        }

        var principal = await CreateSignedInPrincipalAsync(user, request.GetScopes());

        return SignIn(principal, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
    }

    [HttpPost("~/connect/token")]
    [IgnoreAntiforgeryToken]
    public async Task<IActionResult> Exchange()
    {
        var request = HttpContext.GetOpenIddictServerRequest()
            ?? throw new InvalidOperationException("The OpenID Connect request cannot be retrieved.");

        if (request.IsAuthorizationCodeGrantType() || request.IsRefreshTokenGrantType())
        {
            var result = await HttpContext.AuthenticateAsync(OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
            var user = await _userManager.GetUserAsync(result.Principal!);

            // A vanished user (deleted/locked since the token was issued) and a
            // user that can no longer sign in are both "the grant is no longer
            // valid" from the client's perspective - RFC 6749's invalid_grant
            // covers both, so they share one response instead of the first one
            // being a 500.
            if (user is null || !await _signInManager.CanSignInAsync(user))
            {
                return Forbid(
                    authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
                    properties: new AuthenticationProperties(new Dictionary<string, string?>
                    {
                        [OpenIddictServerAspNetCoreConstants.Properties.Error] = OpenIddictConstants.Errors.InvalidGrant,
                    }));
            }

            var principal = await CreateSignedInPrincipalAsync(user, result.Principal!.GetScopes());

            return SignIn(principal, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        if (request.IsClientCredentialsGrantType())
        {
            // M2M: the principal represents the calling service, not a tenant - no tenant_id claim.
            var identity = new ClaimsIdentity(
                authenticationType: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
                nameType: OpenIddictConstants.Claims.Name,
                roleType: OpenIddictConstants.Claims.Role);

            identity.SetClaim(OpenIddictConstants.Claims.Subject, request.ClientId);
            identity.SetClaim(OpenIddictConstants.Claims.Name, request.ClientId);

            var principal = new ClaimsPrincipal(identity);
            principal.SetScopes(request.GetScopes());
            principal.SetResources(await _scopeManager.ListResourcesAsync(principal.GetScopes()).ToListAsync());

            foreach (var claim in principal.Claims)
            {
                claim.SetDestinations(OpenIddictConstants.Destinations.AccessToken);
            }

            return SignIn(principal, OpenIddictServerAspNetCoreDefaults.AuthenticationScheme);
        }

        // grant_type is client-controlled protocol input, not framework-impossible
        // state - an unsupported value is expected client error traffic and gets
        // the literal RFC 6749 error code instead of a 500.
        return Forbid(
            authenticationSchemes: OpenIddictServerAspNetCoreDefaults.AuthenticationScheme,
            properties: new AuthenticationProperties(new Dictionary<string, string?>
            {
                [OpenIddictServerAspNetCoreConstants.Properties.Error] = OpenIddictConstants.Errors.UnsupportedGrantType,
            }));
    }

    private async Task<ClaimsPrincipal> CreateSignedInPrincipalAsync(ApplicationUser user, IEnumerable<string> scopes)
    {
        var principal = await _signInManager.CreateUserPrincipalAsync(user);

        principal.SetScopes(scopes);
        principal.SetResources(await _scopeManager.ListResourcesAsync(principal.GetScopes()).ToListAsync());

        foreach (var claim in principal.Claims)
        {
            claim.SetDestinations(GetDestinations(claim, principal));
        }

        return principal;
    }

    private static IEnumerable<string> GetDestinations(Claim claim, ClaimsPrincipal principal)
    {
        switch (claim.Type)
        {
            case OpenIddictConstants.Claims.Name or OpenIddictConstants.Claims.Email:
                yield return OpenIddictConstants.Destinations.AccessToken;
                if (principal.HasScope(OpenIddictConstants.Scopes.Profile))
                {
                    yield return OpenIddictConstants.Destinations.IdentityToken;
                }

                yield break;

            case "tenant_id":
                yield return OpenIddictConstants.Destinations.AccessToken;
                if (principal.HasScope("tenant_id"))
                {
                    yield return OpenIddictConstants.Destinations.IdentityToken;
                }

                yield break;

            // The security stamp is a secret rotation value - never expose it in a token.
            case "AspNet.Identity.SecurityStamp":
                yield break;

            default:
                yield return OpenIddictConstants.Destinations.AccessToken;
                yield break;
        }
    }
}
