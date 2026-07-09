using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Admin.SharedKernel.Tests;

public class ResultExtensionsTests
{
    private sealed class TestController : ControllerBase
    {
        public TestController()
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() };
        }
    }

    [Theory]
    [InlineData(ErrorType.Validation, StatusCodes.Status400BadRequest)]
    [InlineData(ErrorType.NotFound, StatusCodes.Status404NotFound)]
    [InlineData(ErrorType.Conflict, StatusCodes.Status409Conflict)]
    [InlineData(ErrorType.Forbidden, StatusCodes.Status403Forbidden)]
    [InlineData(ErrorType.Failure, StatusCodes.Status400BadRequest)]
    public void ToHttpStatusCode_MapsEveryErrorType(ErrorType type, int expectedStatusCode)
    {
        type.ToHttpStatusCode().Should().Be(expectedStatusCode);
    }

    [Fact]
    public void ToActionResult_NonGeneric_OnSuccess_InvokesTheSuccessCallback()
    {
        var controller = new TestController();

        var actionResult = Result.Success().ToActionResult(controller, () => controller.NoContent());

        actionResult.Should().BeOfType<NoContentResult>();
    }

    [Fact]
    public void ToActionResult_NonGeneric_OnFailure_ReturnsAProblemWithTheMappedStatusCode()
    {
        var controller = new TestController();
        var error = Error.NotFound("Thing.NotFound", "not found");

        var actionResult = Result.Failure(error).ToActionResult(controller, () => controller.NoContent());

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status404NotFound);
        objectResult.Value.Should().BeOfType<ProblemDetails>()
            .Which.Title.Should().Be("not found");
    }

    [Fact]
    public void ToActionResult_Generic_OnSuccess_PassesTheValueToTheSuccessCallback()
    {
        var controller = new TestController();

        var actionResult = Result.Success(42).ToActionResult(controller, value => controller.Ok(value));

        var okResult = actionResult.Should().BeOfType<OkObjectResult>().Subject;
        okResult.Value.Should().Be(42);
    }

    [Fact]
    public void ToActionResult_Generic_OnFailure_ReturnsAProblemWithTheMappedStatusCode()
    {
        var controller = new TestController();
        var error = Error.Conflict("Thing.Duplicate", "already exists");

        var actionResult = Result.Failure<int>(error).ToActionResult(controller, value => controller.Ok(value));

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status409Conflict);
    }
}
