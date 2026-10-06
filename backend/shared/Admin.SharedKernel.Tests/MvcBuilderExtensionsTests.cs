using System.Text.Json;
using Admin.SharedKernel.AspNetCore;
using Admin.SharedKernel.ValueObjects;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Admin.SharedKernel.Tests;

public class MvcBuilderExtensionsTests
{
    private static ActionContext InvalidActionContext()
    {
        return new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor());
    }

    [Fact]
    public void AddValueObjectJson_ReadsTheDateValueObjectsAgainstTheClockOfTheContainer()
    {
        var services = new ServiceCollection();
        services.AddSingleton<TimeProvider>(new FixedClock(new DateTimeOffset(2026, 10, 2, 12, 0, 0, TimeSpan.Zero)));
        services.AddControllers().AddValueObjectJson();
        var json = services.BuildServiceProvider().GetRequiredService<IOptions<JsonOptions>>().Value.JsonSerializerOptions;

        var today = () => JsonSerializer.Deserialize<DateSample>("{ \"born\": \"2026-10-02\" }", json);

        today.Should().Throw<JsonException>();
        JsonSerializer.Deserialize<DateSample>("{ \"born\": \"2026-10-01\" }", json)!.Born!.Value
            .Should().Be(new DateOnly(2026, 10, 1));
    }

    private sealed record DateSample(BirthDate? Born);

    [Fact]
    public void AddModelStateProblemDetails_AnswersAnInvalidModelWithTheCanonicalProblem()
    {
        var services = new ServiceCollection();
        services.AddControllers().AddModelStateProblemDetails();
        var options = services.BuildServiceProvider().GetRequiredService<IOptions<ApiBehaviorOptions>>().Value;
        var context = InvalidActionContext();
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
