using Admin.SharedKernel.AspNetCore;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace Admin.SharedKernel.Tests;

public class ModelStateErrorMapperTests
{
    private const string ConversionText =
        "The JSON value could not be converted to Some.Command. Path: $.birthDate | LineNumber: 0 | BytePositionInLine: 50.";

    private static readonly FieldError KnownCpf = new("CpfNumber.Invalid", "O CPF informado é inválido.");
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
        return ModelStateErrorMapper.ToError(state, BodyParameters, [KnownCpf]);
    }

    [Fact]
    public void ToError_ReturnsAValidationErrorWithTheCanonicalCode()
    {
        var error = Map(State(("$.cpf", KnownCpf.Message)));

        error.Type.Should().Be(ErrorType.Validation);
        error.Code.Should().Be("Validation.Failed");
        error.Message.Should().Be(KnownCpf.Message);
    }

    [Fact]
    public void ToError_KeepsTheCodeAndMessageOfAKnownErrorAndDropsTheJsonRoot()
    {
        var error = Map(State(("$.cpf", KnownCpf.Message)));

        error.FieldErrors.Should().ContainSingle().Which.Should().Match<KeyValuePair<string, IReadOnlyList<FieldError>>>(
            pair => pair.Key == "cpf" && pair.Value.Count == 1 && pair.Value[0].Code == "CpfNumber.Invalid");
    }

    [Fact]
    public void ToError_KeepsTheIndexedPathOfANestedField()
    {
        var error = Map(State(("$.guardians[0].cpf", KnownCpf.Message)));

        error.FieldErrors.Should().ContainKey("guardians[0].cpf");
    }

    [Fact]
    public void ToError_ATypeConversionFailureBecomesAnInvalidValue()
    {
        var error = Map(State(("$.birthDate", ConversionText)));

        error.FieldErrors!["birthDate"].Should().Equal(RequestErrors.InvalidValue);
    }

    [Fact]
    public void ToError_AMissingRequiredFieldBecomesFieldRequired()
    {
        var error = Map(State(("FullName", "The FullName field is required.")));

        error.FieldErrors!["FullName"].Should().Equal(RequestErrors.FieldRequired);
    }

    [Fact]
    public void ToError_AnUnrecognisedMessageUnderAFieldBecomesAnInvalidValueOfThatField()
    {
        var error = Map(State(("Page", "The value 'abc' is not valid.")));

        error.FieldErrors!["Page"].Should().Equal(RequestErrors.InvalidValue);
    }

    [Theory]
    [InlineData("$.fullName", "Expected depth to be zero at the end of the JSON payload. Path: $.fullName | LineNumber: 0 | BytePositionInLine: 12.")]
    [InlineData("", "A non-empty request body is required.")]
    [InlineData("$", "'x' is an invalid start of a value. Path: $ | LineNumber: 0 | BytePositionInLine: 0.")]
    public void ToError_ASyntaxOrEmptyBodyErrorBelongsToTheForm(string key, string text)
    {
        var error = Map(State((key, text)));

        error.FieldErrors!.Should().ContainSingle().Which.Key.Should().BeEmpty();
        error.FieldErrors[string.Empty].Should().Equal(RequestErrors.Invalid);
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

        error.FieldErrors!["command"].Should().Equal(RequestErrors.FieldRequired);
    }

    [Fact]
    public void ToError_GroupsSeveralErrorsOfTheSameField()
    {
        var error = Map(State(("Page", "The value 'abc' is not valid."), ("Page", "The Page field is required.")));

        error.FieldErrors!["Page"].Should().Equal(RequestErrors.InvalidValue, RequestErrors.FieldRequired);
    }

    [Fact]
    public void ToError_IgnoresEntriesWithoutErrors()
    {
        var state = State(("$.cpf", KnownCpf.Message));
        state.SetModelValue("name", "x", "x");

        var error = Map(state);

        error.FieldErrors!.Keys.Should().Equal("cpf");
    }

    [Fact]
    public void ToError_ProducesCamelCaseKeysOnceRenderedAsAProblem()
    {
        var error = Map(State(("FullName", "The FullName field is required."), ("$.guardians[0].cpf", KnownCpf.Message)));

        var problem = ApiProblemDetailsFactory.CreateValidationProblem(error);

        problem.Code.Should().Be("Validation.Failed");
        problem.Errors!.Keys.Should().BeEquivalentTo("fullName", "guardians[0].cpf");
    }
}
