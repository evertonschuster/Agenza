using Admin.SharedKernel.AspNetCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Admin.SharedKernel.Tests;

public class MvcBuilderExtensionsTests
{
    private static ActionContext BodyActionContext()
    {
        return new ActionContext
        {
            HttpContext = new DefaultHttpContext(),
            RouteData = new RouteData(),
            ActionDescriptor = new ControllerActionDescriptor
            {
                Parameters =
                [
                    new ParameterDescriptor
                    {
                        Name = "command",
                        ParameterType = typeof(object),
                        BindingInfo = new BindingInfo { BindingSource = BindingSource.Body },
                    },
                ],
            },
        };
    }

    [Fact]
    public void AddModelStateProblemDetails_AnswersAnInvalidModelWithTheCanonicalProblem()
    {
        var services = new ServiceCollection();
        services.AddControllers().AddModelStateProblemDetails();
        var options = services.BuildServiceProvider().GetRequiredService<IOptions<ApiBehaviorOptions>>().Value;
        var context = BodyActionContext();
        context.ModelState.AddModelError("command", "The command field is required.");
        context.ModelState.AddModelError("$.cpf", "O CPF informado é inválido.");

        var result = options.InvalidModelStateResponseFactory(context);

        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        var problem = objectResult.Value.Should().BeOfType<ApiProblemDetails>().Subject;
        problem.Code.Should().Be("Validation.Failed");
        problem.Status.Should().Be(StatusCodes.Status400BadRequest);
        problem.TraceId.Should().NotBeNullOrWhiteSpace();
        problem.Errors!.Keys.Should().Equal("cpf");
        problem.Errors["cpf"].Should().Equal(new FieldError("Validation.Failed", "O CPF informado é inválido."));
    }
}
