using Admin.SharedKernel.AspNetCore;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Text.Json;
using HttpJsonOptions = Microsoft.AspNetCore.Http.Json.JsonOptions;

namespace Admin.SharedKernel.Tests;

public class MvcBuilderExtensionsTests
{
    private static ActionContext InvalidActionContext()
    {
        return new ActionContext(new DefaultHttpContext(), new RouteData(), new ActionDescriptor());
    }

    [Fact]
    public void AddWireJson_ReadsTheDateValueObjectsAgainstTheClockOfTheContainer()
    {
        var json = MvcJsonOptions(new FixedClock(new DateTimeOffset(2026, 10, 2, 12, 0, 0, TimeSpan.Zero)));

        var today = () => JsonSerializer.Deserialize<DateSample>("{ \"born\": \"2026-10-02\" }", json);

        today.Should().Throw<JsonException>();
        JsonSerializer.Deserialize<DateSample>("{ \"born\": \"2026-10-01\" }", json)!.Born!.Value
            .Should().Be(new DateOnly(2026, 10, 1));
    }

    private sealed record DateSample(BirthDate? Born);

    [Fact]
    public void AddWireJson_NamesEnumsInCamelCaseInTheMvcOptions()
    {
        var json = MvcJsonOptions(TimeProvider.System);

        JsonSerializer.Serialize(new EnumSample(Level.VeryHigh), json).Should().Be("{\"level\":\"veryHigh\"}");
        JsonSerializer.Deserialize<EnumSample>("{ \"level\": \"veryHigh\" }", json)!.Level.Should().Be(Level.VeryHigh);
        var integer = () => JsonSerializer.Deserialize<EnumSample>("{ \"level\": 1 }", json);
        integer.Should().Throw<JsonException>();
    }

    [Fact]
    public void AddWireJson_NamesEnumsInTheMinimalApiOptionsThatTheOpenApiGeneratorReads()
    {
        var services = new ServiceCollection();
        services.AddSingleton(TimeProvider.System);
        services.AddControllers().AddWireJson();
        var json = services.BuildServiceProvider().GetRequiredService<IOptions<HttpJsonOptions>>().Value.SerializerOptions;

        JsonSerializer.Serialize(new EnumSample(Level.VeryHigh), json).Should().Be("{\"level\":\"veryHigh\"}");
    }

    private static JsonSerializerOptions MvcJsonOptions(TimeProvider timeProvider)
    {
        var services = new ServiceCollection();
        services.AddSingleton(timeProvider);
        services.AddControllers().AddWireJson();

        return services.BuildServiceProvider().GetRequiredService<IOptions<JsonOptions>>().Value.JsonSerializerOptions;
    }

    private enum Level
    {
        Low = 1,
        VeryHigh = 2,
    }

    private sealed record EnumSample(Level Level);

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
