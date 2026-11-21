using System.Reflection;
using System.Security.Claims;
using Admin.Identity.Client;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;

namespace Admin.SharedKernel.Tests;

public sealed class TenantHeaderFilterTests
{
    private const string Tenant = "04b6ea04-b83b-4a5f-abcc-edb5042545ca";

    private static async Task<(bool Executed, IActionResult? Result)> ExecuteAsync(string? header, string? tenant = Tenant)
    {
        var identity = new ClaimsIdentity("Bearer");
        if (tenant is not null)
        {
            identity.AddClaim(new Claim("tenant_id", tenant));
        }
        var httpContext = new DefaultHttpContext { User = new ClaimsPrincipal(identity) };
        if (header is not null)
        {
            httpContext.Request.Headers[TenantHeaderFilter.HeaderName] = header;
        }
        var accessor = new HttpContextTenantAccessor(new HttpContextAccessor { HttpContext = httpContext });
        var descriptor = new ControllerActionDescriptor
        {
            ControllerTypeInfo = typeof(ProbeController).GetTypeInfo(),
            MethodInfo = typeof(ProbeController).GetMethod(nameof(ProbeController.Action))!,
        };
        var action = new ActionContext(httpContext, new RouteData(), descriptor, new ModelStateDictionary());
        var controller = new ProbeController();
        var context = new ActionExecutingContext(action, [], new Dictionary<string, object?>(), controller);
        var executed = false;
        await new TenantHeaderFilter(accessor).OnActionExecutionAsync(context, () =>
        {
            executed = true;
            return Task.FromResult(new ActionExecutedContext(action, [], controller));
        });
        return (executed, context.Result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("invalido")]
    [InlineData("00000000-0000-0000-0000-000000000000")]
    [InlineData("13f4c8f8-a2c3-46ed-bcb9-665d7456212e")]
    public async Task Api_recusa_header_ausente_invalido_ou_diferente_do_token(string? header)
    {
        var (executed, result) = await ExecuteAsync(header);

        executed.Should().BeFalse();
        var response = result.Should().BeOfType<ObjectResult>().Subject;
        response.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
        response.Value.Should().BeOfType<ProblemDetails>().Subject.Extensions["code"]
            .Should().Be("Tenant.ContextMismatch");
    }

    [Fact]
    public async Task Api_aceita_header_correspondente_ao_tenant_do_token()
    {
        var (executed, result) = await ExecuteAsync(Tenant);

        executed.Should().BeTrue();
        result.Should().BeNull();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("invalido")]
    [InlineData("00000000-0000-0000-0000-000000000000")]
    public async Task Header_nao_substitui_claim_de_tenant_valida(string? tenant)
    {
        var (executed, result) = await ExecuteAsync(Tenant, tenant);

        executed.Should().BeFalse();
        result.Should().BeOfType<ObjectResult>().Subject.StatusCode.Should().Be(StatusCodes.Status403Forbidden);
    }

    private sealed class ProbeController
    {
        public void Action()
        {
        }
    }
}
