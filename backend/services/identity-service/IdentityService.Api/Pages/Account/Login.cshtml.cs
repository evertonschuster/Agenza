using IdentityService.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.WebUtilities;
using IdentitySignInResult = Microsoft.AspNetCore.Identity.SignInResult;

namespace IdentityService.Api.Pages.Account;

public class LoginModel : PageModel
{
    private readonly SignInManager<ApplicationUser> _signInManager;

    public LoginModel(SignInManager<ApplicationUser> signInManager)
    {
        _signInManager = signInManager;
    }

    [BindProperty]
    public string Email { get; set; } = string.Empty;

    [BindProperty]
    public string Password { get; set; } = string.Empty;

    public string? ReturnUrl { get; private set; }

    public string? ErrorMessage { get; private set; }

    public string? ErrorTitle { get; private set; }

    public string? ErrorCode { get; private set; }

    public string? Theme { get; private set; }

    public void OnGet(string? returnUrl = null)
    {
        SetRequestContext(returnUrl);
    }

    public async Task<IActionResult> OnPostAsync(string? returnUrl = null)
    {
        var result = await _signInManager.PasswordSignInAsync(
            Email,
            Password,
            isPersistent: true,
            lockoutOnFailure: true);

        if (!result.Succeeded)
        {
            SetRequestContext(returnUrl);
            SetFailureFeedback(result);
            return Page();
        }

        return LocalRedirect(Url.IsLocalUrl(returnUrl) ? returnUrl : "/");
    }

    private void SetFailureFeedback(IdentitySignInResult result)
    {
        if (result.IsLockedOut)
        {
            ErrorTitle = "Conta temporariamente bloqueada";
            ErrorMessage = "Houve várias tentativas sem sucesso. Aguarde 5 minutos antes de tentar novamente.";
            ErrorCode = "AUTH_ACCOUNT_LOCKED";
            return;
        }

        if (result.IsNotAllowed)
        {
            ErrorTitle = "Acesso ainda não liberado";
            ErrorMessage = "A conta existe, mas ainda não está autorizada a entrar. Verifique se a ativação da conta foi concluída.";
            ErrorCode = "AUTH_ACCOUNT_NOT_ALLOWED";
            return;
        }

        if (result.RequiresTwoFactor)
        {
            ErrorTitle = "Verificação adicional necessária";
            ErrorMessage = "Esta conta exige uma segunda etapa de verificação, que ainda não está disponível neste fluxo.";
            ErrorCode = "AUTH_TWO_FACTOR_REQUIRED";
            return;
        }

        ErrorTitle = "Credenciais não conferem";
        ErrorMessage = "O e-mail ou a senha informados não correspondem. Confira os dois campos e tente novamente.";
        ErrorCode = "AUTH_INVALID_CREDENTIALS";
    }

    private void SetRequestContext(string? returnUrl)
    {
        ReturnUrl = Url.IsLocalUrl(returnUrl) ? returnUrl : null;
        Theme = ResolveTheme(returnUrl);
    }

    private static string? ResolveTheme(string? returnUrl)
    {
        if (string.IsNullOrWhiteSpace(returnUrl))
        {
            return null;
        }

        var queryStart = returnUrl.IndexOf('?', StringComparison.Ordinal);
        if (queryStart < 0)
        {
            return null;
        }

        var fragmentStart = returnUrl.IndexOf('#', queryStart);
        var query = fragmentStart < 0
            ? returnUrl[queryStart..]
            : returnUrl[queryStart..fragmentStart];
        var theme = QueryHelpers.ParseQuery(query).GetValueOrDefault("theme").ToString();

        return theme is "light" or "dark" ? theme : null;
    }
}
