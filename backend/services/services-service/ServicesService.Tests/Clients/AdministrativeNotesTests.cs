using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Clients;

public class AdministrativeNotesTests
{
    [Fact]
    public void Create_TrimsTheNotes()
    {
        AdministrativeNotes.Create("  Prefere atendimento à tarde.  ").Value!.Value
            .Should().Be("Prefere atendimento à tarde.");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankValue_ReturnsNull(string? raw)
    {
        var result = AdministrativeNotes.Create(raw);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeNull();
    }

    [Fact]
    public void Create_LimitsTheNotesToFiveHundredCharacters()
    {
        AdministrativeNotes.Create(new string('n', AdministrativeNotes.MaxLength)).IsSuccess.Should().BeTrue();

        var result = AdministrativeNotes.Create(new string('n', AdministrativeNotes.MaxLength + 1));

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("AdministrativeNotes.TooLong");
    }

    [Fact]
    public void Restore_AcceptsNotesThatCreateWouldReject()
    {
        var tooLong = new string('n', AdministrativeNotes.MaxLength + 1);

        AdministrativeNotes.Restore(tooLong).Value.Should().Be(tooLong);
    }
}
