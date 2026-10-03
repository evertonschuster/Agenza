namespace Admin.SharedKernel.Tests;

public class ErrorCombineTests
{
    private static Error FieldConflict(string field, string code)
    {
        return new Error(
            code,
            $"{code} message",
            ErrorType.Conflict,
            new Dictionary<string, IReadOnlyList<FieldError>> { [field] = [new FieldError(code, $"{code} message")] });
    }

    [Fact]
    public void Combine_WithNoErrors_ReturnsNull()
    {
        Error.Combine().Should().BeNull();
        Error.Combine(null, null).Should().BeNull();
    }

    [Fact]
    public void Combine_WithASingleError_ReturnsItUnchanged()
    {
        var error = FieldConflict("Cpf", "Client.DuplicateCpf");

        Error.Combine(null, error, null).Should().Be(error);
    }

    [Fact]
    public void Combine_MergesTheFieldsAndKeepsTheFirstErrorOnTop()
    {
        var combined = Error.Combine(FieldConflict("Cpf", "Client.DuplicateCpf"), FieldConflict("Email", "Client.DuplicateEmail"));

        combined!.Value.Code.Should().Be("Client.DuplicateCpf");
        combined.Value.Message.Should().Be("Client.DuplicateCpf message");
        combined.Value.Type.Should().Be(ErrorType.Conflict);
        combined.Value.FieldErrors!.Keys.Should().Equal("Cpf", "Email");
    }

    [Fact]
    public void Combine_AppendsErrorsOfTheSameField()
    {
        var combined = Error.Combine(FieldConflict("Cpf", "First"), FieldConflict("Cpf", "Second"));

        combined!.Value.FieldErrors!["Cpf"].Select(fieldError => fieldError.Code).Should().Equal("First", "Second");
    }

    [Fact]
    public void Combine_PutsAnErrorWithoutFieldsUnderTheEmptyKey()
    {
        var combined = Error.Combine(FieldConflict("Cpf", "Client.DuplicateCpf"), Error.Conflict("Tag.InUse", "In use."));

        combined!.Value.FieldErrors!.Keys.Should().Equal("Cpf", string.Empty);
        combined.Value.FieldErrors[string.Empty].Should().ContainSingle()
            .Which.Should().Be(new FieldError("Tag.InUse", "In use."));
    }
}
