namespace Admin.SharedKernel.Tests;

public class ErrorConflictTests
{
    [Fact]
    public void Conflict_WithoutField_KeepsTheShapeWithoutFieldErrors()
    {
        var error = Error.Conflict("Tag.InUse", "In use.");

        error.Type.Should().Be(ErrorType.Conflict);
        error.FieldErrors.Should().BeNull();
    }

    [Fact]
    public void Conflict_WithField_PutsTheSameCodeAndMessageUnderThatField()
    {
        var error = Error.Conflict("Client.DuplicateEmail", "Already exists.", field: "Email");

        error.Type.Should().Be(ErrorType.Conflict);
        error.Code.Should().Be("Client.DuplicateEmail");
        error.Message.Should().Be("Already exists.");
        error.FieldErrors!.Keys.Should().Equal("Email");
        error.FieldErrors["Email"].Should().ContainSingle()
            .Which.Should().Be(new FieldError("Client.DuplicateEmail", "Already exists."));
    }

    [Fact]
    public void Conflict_WithMeta_AttachesItToTheFieldError()
    {
        var meta = new Dictionary<string, string> { ["clientId"] = "0197f2a0-0000-7000-8000-000000000001" };

        var error = Error.Conflict("Client.DuplicateCpf", "Already exists.", field: "Cpf", meta: meta);

        error.FieldErrors!["Cpf"][0].Meta.Should().BeSameAs(meta);
    }
}
