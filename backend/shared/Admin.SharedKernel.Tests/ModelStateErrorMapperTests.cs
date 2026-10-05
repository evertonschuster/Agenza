using Admin.SharedKernel.AspNetCore;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Admin.SharedKernel.Tests;

public class ModelStateErrorMapperTests
{
    private const string ConversionText =
        "The JSON value could not be converted to Some.Command. Path: $.birthDate | LineNumber: 0 | BytePositionInLine: 50.";

    private static readonly string ConverterText = WireErrorText.Encode("CpfNumber.Invalid", "O CPF informado é inválido.");
    private static readonly FieldError ConverterError = new("CpfNumber.Invalid", "O CPF informado é inválido.");
    private static readonly string[] BodyParameters = ["command"];

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
        return ModelStateErrorMapper.ToError(state, BodyParameters);
    }

    [Fact]
    public void ToError_ReturnsAValidationErrorWithTheCanonicalCode()
    {
        var error = Map(State(("$.cpf", ConverterText)));

        error.Type.Should().Be(ErrorType.Validation);
        error.Code.Should().Be("Validation.Failed");
        error.Message.Should().Be(ConverterError.Message);
    }

    [Fact]
    public void ToError_AConverterFailureKeepsItsOwnCodeAndMessageUnderTheField()
    {
        var error = Map(State(("$.cpf", ConverterText)));

        error.FieldErrors!.Should().ContainSingle().Which.Key.Should().Be("cpf");
        error.FieldErrors["cpf"].Should().Equal(ConverterError);
    }

    [Fact]
    public void ToError_KeepsTheIndexedPathOfANestedField()
    {
        var error = Map(State(("$.guardians[0].cpf", ConverterText)));

        error.FieldErrors!["guardians[0].cpf"].Should().Equal(ConverterError);
    }

    [Fact]
    public void ToError_ATypeConversionFailureKeepsTheFrameworkText()
    {
        var error = Map(State(("$.birthDate", ConversionText)));

        error.FieldErrors!["birthDate"].Should().Equal(new FieldError("Validation.Failed", ConversionText));
    }

    [Fact]
    public void ToError_AMissingRequiredFieldKeepsTheFrameworkText()
    {
        var error = Map(State(("FullName", "The FullName field is required.")));

        error.FieldErrors!["FullName"].Should().Equal(new FieldError("Validation.Failed", "The FullName field is required."));
    }

    [Fact]
    public void ToError_AnUnrecognisedMessageUnderAFieldKeepsItsText()
    {
        var error = Map(State(("Page", "The value 'abc' is not valid.")));

        error.FieldErrors!["Page"].Should().Equal(new FieldError("Validation.Failed", "The value 'abc' is not valid."));
    }

    [Theory]
    [InlineData("$.fullName", "Expected depth to be zero at the end of the JSON payload. Path: $.fullName | LineNumber: 0 | BytePositionInLine: 12.")]
    [InlineData("", "A non-empty request body is required.")]
    [InlineData("$", "'x' is an invalid start of a value. Path: $ | LineNumber: 0 | BytePositionInLine: 0.")]
    public void ToError_ASyntaxOrEmptyBodyErrorBelongsToTheFormAndKeepsItsText(string key, string text)
    {
        var error = Map(State((key, text)));

        error.FieldErrors!.Should().ContainSingle().Which.Key.Should().BeEmpty();
        error.FieldErrors[string.Empty].Should().Equal(new FieldError("Validation.Failed", text));
    }

    [Fact]
    public void ToError_AJsonPathMessageWithoutCodeOrParserPositionKeepsItsTextUnderTheField()
    {
        var error = Map(State(("$.cpf", "O CPF informado é inválido.")));

        error.FieldErrors!["cpf"].Should().Equal(new FieldError("Validation.Failed", "O CPF informado é inválido."));
    }

    [Fact]
    public void ToError_DropsTheBodyParameterEntryWhenAnotherErrorExplainsIt()
    {
        var error = Map(State(
            ("command", "The command field is required."),
            ("$.birthDate", ConversionText)));

        error.FieldErrors!.Keys.Should().Equal("birthDate");
    }

    [Fact]
    public void ToError_KeepsTheBodyParameterEntryWhenItIsTheOnlyError()
    {
        var error = Map(State(("command", "The command field is required.")));

        error.FieldErrors!["command"].Should().Equal(new FieldError("Validation.Failed", "The command field is required."));
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

    [Fact]
    public void ToError_ProducesCamelCaseKeysOnceRenderedAsAProblem()
    {
        var error = Map(State(("FullName", "The FullName field is required."), ("$.guardians[0].cpf", ConverterText)));

        var problem = ApiProblemDetailsFactory.CreateValidationProblem(error);

        problem.Code.Should().Be("Validation.Failed");
        problem.Errors!.Keys.Should().BeEquivalentTo("fullName", "guardians[0].cpf");
    }
}
