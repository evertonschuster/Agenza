using Admin.SharedKernel.ValueObjects;

namespace Admin.SharedKernel.Tests;

public class AdministrativeNotesTests
{
    private const string TooLong = "As observações administrativas devem ter no máximo 500 caracteres.";
    private const string NotText = "As observações administrativas devem ser um texto de até 500 caracteres.";

    [Fact]
    public void Create_TrimsTheNotes()
    {
        AdministrativeNotes.Create("  Prefere atendimento à tarde.  ").Value.Value.Should().Be("Prefere atendimento à tarde.");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlank_FailsBecauseBlankIsHandledBeforeIt(string? raw)
    {
        var result = AdministrativeNotes.Create(raw);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(NotText);
    }

    [Fact]
    public void Create_WithExactlyTheMaximumLength_Succeeds()
    {
        AdministrativeNotes.Create(new string('n', AdministrativeNotes.MaxLength)).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Create_WithOneCharacterOverTheMaximum_FailsWithTheLengthMessage()
    {
        var result = AdministrativeNotes.Create(new string('n', AdministrativeNotes.MaxLength + 1));

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(TooLong);
    }

    [Fact]
    public void Create_CountsTheLengthAfterTrimming()
    {
        AdministrativeNotes.Create("  " + new string('n', AdministrativeNotes.MaxLength) + "  ").IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Restore_AcceptsNotesThatCreateWouldReject()
    {
        var tooLong = new string('n', AdministrativeNotes.MaxLength + 1);

        AdministrativeNotes.Restore(tooLong).Value.Should().Be(tooLong);
    }
}
