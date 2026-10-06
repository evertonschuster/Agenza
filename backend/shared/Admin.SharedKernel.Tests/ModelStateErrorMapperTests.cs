using System.Text.Json;
using Admin.SharedKernel.AspNetCore;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Admin.SharedKernel.Tests;

public class ModelStateErrorMapperTests
{
    private const string ConversionText =
        "The JSON value could not be converted to Some.Command. Path: $.birthDate | LineNumber: 0 | BytePositionInLine: 50.";

    private const string ConverterText = "O CPF informado é inválido.";

    private sealed record Body(DateOnly? BirthDate);

    private static FieldError BindingError(string text) => new("Validation.Failed", text);

    private static ModelStateDictionary State(params (string Key, string Message)[] errors)
    {
        var state = new ModelStateDictionary();
        foreach (var (key, message) in errors)
        {
            state.AddModelError(key, message);
        }

        return state;
    }

    private static Error Map(ModelStateDictionary state)
    {
        return ModelStateErrorMapper.ToError(state);
    }

    [Fact]
    public void ToError_ReturnsAValidationErrorWithTheCanonicalCode()
    {
        var error = Map(State(("$.cpf", ConverterText)));

        error.Type.Should().Be(ErrorType.Validation);
        error.Code.Should().Be("Validation.Failed");
        error.Message.Should().Be(ConverterText);
    }

    [Fact]
    public void ToError_AConverterFailureKeepsItsMessageUnderTheFieldWithoutTheJsonRoot()
    {
        var error = Map(State(("$.cpf", ConverterText)));

        error.FieldErrors!.Should().ContainSingle().Which.Key.Should().Be("cpf");
        error.FieldErrors["cpf"].Should().Equal(BindingError(ConverterText));
    }

    [Fact]
    public void ToError_KeepsTheIndexedPathOfANestedField()
    {
        var error = Map(State(("$.guardians[0].cpf", ConverterText)));

        error.FieldErrors!["guardians[0].cpf"].Should().Equal(BindingError(ConverterText));
    }

    [Fact]
    public void ToError_ATypeConversionFailureKeepsTheFrameworkText()
    {
        var error = Map(State(("$.birthDate", ConversionText)));

        error.FieldErrors!["birthDate"].Should().Equal(BindingError(ConversionText));
    }

    [Fact]
    public void ToError_AMissingRequiredFieldKeepsTheFrameworkText()
    {
        var error = Map(State(("FullName", "The FullName field is required.")));

        error.FieldErrors!["FullName"].Should().Equal(BindingError("The FullName field is required."));
    }

    [Fact]
    public void ToError_AnUnrecognisedMessageUnderAFieldKeepsItsText()
    {
        var error = Map(State(("Page", "The value 'abc' is not valid.")));

        error.FieldErrors!["Page"].Should().Equal(BindingError("The value 'abc' is not valid."));
    }

    [Theory]
    [InlineData("$.fullName", "Expected depth to be zero at the end of the JSON payload. Path: $.fullName | LineNumber: 0 | BytePositionInLine: 12.")]
    [InlineData("", "A non-empty request body is required.")]
    [InlineData("$", "'x' is an invalid start of a value. Path: $ | LineNumber: 0 | BytePositionInLine: 0.")]
    public void ToError_ASyntaxOrEmptyBodyErrorBelongsToTheFormAndKeepsItsText(string key, string text)
    {
        var error = Map(State((key, text)));

        error.FieldErrors!.Should().ContainSingle().Which.Key.Should().BeEmpty();
        error.FieldErrors[string.Empty].Should().Equal(BindingError(text));
    }

    [Fact]
    public void ToError_KeepsTheEntryTheFrameworkAddsForTheBodyParameter()
    {
        var error = Map(State(
            ("$.birthDate", ConversionText),
            ("command", "The command field is required.")));

        error.FieldErrors!.Keys.Should().BeEquivalentTo(["birthDate", "command"]);
        error.FieldErrors["command"].Should().Equal(BindingError("The command field is required."));
    }

    [Fact]
    public void ToError_GroupsSeveralErrorsOfTheSameField()
    {
        var error = Map(State(("Page", "The value 'abc' is not valid."), ("Page", "The Page field is required.")));

        error.FieldErrors!["Page"].Should().HaveCount(2);
    }

    [Fact]
    public void ToError_IgnoresEntriesWithoutErrors()
    {
        var state = State(("$.cpf", ConverterText));
        state.SetModelValue("name", "x", "x");

        var error = Map(state);

        error.FieldErrors!.Keys.Should().Equal("cpf");
    }

    // The mapper reads the framework's wording, so these two take the text from System.Text.Json itself, as MVC does
    // (key = the exception's Path, text = its Message): a .NET update that rewords it fails here, not in production.
    [Fact]
    public void ToError_ARealTypeConversionFailureStaysUnderItsField()
    {
        var act = () => JsonSerializer.Deserialize<Body>("""{ "birthDate": "not a date" }""", JsonSerializerOptions.Web);
        var exception = act.Should().Throw<JsonException>().Which;

        var error = Map(State((exception.Path!, exception.Message)));

        error.FieldErrors!.Keys.Should().Equal("birthDate");
    }

    [Fact]
    public void ToError_ARealSyntaxErrorBelongsToTheForm()
    {
        var act = () => JsonSerializer.Deserialize<Body>("""{ "birthDate": """, JsonSerializerOptions.Web);
        var exception = act.Should().Throw<JsonException>().Which;

        var error = Map(State((exception.Path!, exception.Message)));

        error.FieldErrors!.Keys.Should().Equal(string.Empty);
    }

    [Fact]
    public void ToError_ProducesCamelCaseKeysOnceRenderedAsAProblem()
    {
        var error = Map(State(("FullName", "The FullName field is required."), ("$.guardians[0].cpf", ConverterText)));

        var problem = ApiProblemDetailsFactory.CreateValidationProblem(error);

        problem.Code.Should().Be("Validation.Failed");
        problem.Errors!.Keys.Should().BeEquivalentTo("fullName", "guardians[0].cpf");
    }
}
