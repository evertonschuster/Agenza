using IdentityService.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

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

    public string? ErrorMessage { get; private set; }

    public void OnGet(string? returnUrl = null)
    {
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
            ErrorMessage = "Invalid email or password.";
            return Page();
        }

        return LocalRedirect(returnUrl ?? "/");
    }
}
