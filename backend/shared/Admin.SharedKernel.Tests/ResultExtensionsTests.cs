using Admin.SharedKernel.AspNetCore;
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
        var problemDetails = objectResult.Value.Should().BeOfType<ApiProblemDetails>().Subject;
        problemDetails.Title.Should().Be("not found");
        problemDetails.TraceId.Should().NotBeNullOrWhiteSpace();
        problemDetails.CorrelationId.Should().NotBeNullOrWhiteSpace();
        problemDetails.Errors.Should().ContainKey(string.Empty);
    }

    [Fact]
    public void ToActionResult_Generic_OnSuccess_PassesTheValueToTheSuccessCallback()
    {
        var controller = new TestController();

        var actionResult = Result.Success(42).ToActionResult(controller, value => controller.Ok(value));

        var okResult = actionResult.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<ApiResponse<int>>().Subject;
        response.Data.Should().Be(42);
        response.Success.Should().BeTrue();
        response.Timestamp.Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromSeconds(1));
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

    [Fact]
    public void ToActionResult_OnValidationFailureWithoutFieldErrors_CarriesTheErrorUnderTheEmptyKey()
    {
        var controller = new TestController();
        var error = Error.Validation("FullName.Required", "O nome completo é obrigatório.");

        var actionResult = Result.Failure(error).ToActionResult(controller, () => controller.NoContent());

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        var problemDetails = objectResult.Value.Should().BeOfType<ApiProblemDetails>().Subject;
        problemDetails.Title.Should().Be("Ocorreram erros de validação.");
        problemDetails.Code.Should().Be("FullName.Required");
        problemDetails.TraceId.Should().NotBeNullOrWhiteSpace();
        problemDetails.CorrelationId.Should().NotBeNullOrWhiteSpace();
        problemDetails.Errors!.Keys.Should().Equal(string.Empty);
        problemDetails.Errors[string.Empty].Should()
            .Equal(new FieldError("FullName.Required", "O nome completo é obrigatório."));
    }

    [Fact]
    public void ToActionResult_OnValidationFailureWithFieldErrors_ReturnsAStructuredProblemDetails()
    {
        var controller = new TestController();
        IReadOnlyList<FieldError> nameErrors =
            [new FieldError("Service.NameTooLong", "O nome deve possuir no máximo 100 caracteres.")];
        var fieldErrors = new Dictionary<string, IReadOnlyList<FieldError>> { ["Name"] = nameErrors };
        var error = Error.Validation("Validation.Failed", "bad input", fieldErrors);

        var actionResult = Result.Failure(error).ToActionResult(controller, () => controller.NoContent());

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status400BadRequest);
        var problemDetails = objectResult.Value.Should().BeOfType<ApiProblemDetails>().Subject;
        problemDetails.Title.Should().Be("Ocorreram erros de validação.");
        problemDetails.Code.Should().Be("Validation.Failed");
        problemDetails.TraceId.Should().NotBeNullOrWhiteSpace();
        problemDetails.CorrelationId.Should().NotBeNullOrWhiteSpace();
        problemDetails.Errors!.Keys.Should().Equal("name");
        problemDetails.Errors["name"].Should().BeSameAs(nameErrors);
    }

    [Fact]
    public void ToActionResult_OnConflictWithFieldErrors_KeepsTheKeyedErrorsAndTheirMeta()
    {
        var controller = new TestController();
        var meta = new Dictionary<string, string> { ["clientId"] = "0197f2a0-0000-7000-8000-000000000001" };
        var fieldErrors = new Dictionary<string, IReadOnlyList<FieldError>>
        {
            ["Cpf"] = [new FieldError("Client.DuplicateCpf", "Já existe uma pessoa cadastrada com este CPF.", meta)],
        };
        var error = new Error("Client.DuplicateCpf", "Já existe uma pessoa cadastrada com este CPF.", ErrorType.Conflict, fieldErrors);

        var actionResult = Result.Failure<int>(error).ToActionResult(controller, value => controller.Ok(value));

        var objectResult = actionResult.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(StatusCodes.Status409Conflict);
        var problemDetails = objectResult.Value.Should().BeOfType<ApiProblemDetails>().Subject;
        problemDetails.Code.Should().Be("Client.DuplicateCpf");
        problemDetails.Errors!.Keys.Should().Equal("cpf");
        problemDetails.Errors["cpf"][0].Meta.Should().BeSameAs(meta);
    }

    [Fact]
    public void ToActionResult_Generic_OnSuccess_WithCreated_WrapsInEnvelope()
    {
        var controller = new TestController();

        var actionResult = Result.Success("new-id").ToActionResult(controller, id => controller.Created($"/api/items/{id}", id));

        var createdResult = actionResult.Should().BeOfType<CreatedResult>().Subject;
        var response = createdResult.Value.Should().BeOfType<ApiResponse<string>>().Subject;
        response.Data.Should().Be("new-id");
        response.Success.Should().BeTrue();
        response.TraceId.Should().NotBeNullOrWhiteSpace();
        response.CorrelationId.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public void ToActionResult_Generic_OnSuccess_WithComplexObject_WrapsInEnvelope()
    {
        var controller = new TestController();
        var complexObject = new { Name = "Test", Count = 10 };

        var actionResult = Result.Success(complexObject).ToActionResult(controller, obj => controller.Ok(obj));

        var okResult = actionResult.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().NotBeNull();
        // Response should be wrapped in ApiResponse
        response.Should().NotBeSameAs(complexObject);
    }
}
