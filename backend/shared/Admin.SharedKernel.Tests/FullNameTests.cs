using Admin.SharedKernel.ValueObjects;

namespace Admin.SharedKernel.Tests;

public class FullNameTests
{
    [Fact]
    public void Create_TrimsTheName()
    {
        FullName.Create("  Maria Souza  ").Value.Value.Should().Be("Maria Souza");
    }

    [Theory]
    [InlineData(null, "O nome completo é obrigatório.")]
    [InlineData("", "O nome completo é obrigatório.")]
    [InlineData("   ", "O nome completo é obrigatório.")]
    [InlineData("A", "O nome completo deve ter pelo menos 2 caracteres.")]
    [InlineData(" A ", "O nome completo deve ter pelo menos 2 caracteres.")]
    public void Create_WithMissingOrTooShortName_FailsWithTheMessageOfTheBrokenRule(string? raw, string expectedMessage)
    {
        var result = FullName.Create(raw);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(expectedMessage);
    }

    [Fact]
    public void Create_WithATooLongName_FailsWithTheMaximumMessage()
    {
        var result = FullName.Create(new string('a', FullName.MaxLength + 1));

        result.Error.Should().Be("O nome completo deve ter no máximo 150 caracteres.");
    }

    [Fact]
    public void Create_AcceptsNamesBetweenTwoAndOneHundredFiftyCharactersAfterTrim()
    {
        FullName.Create("Jo").IsSuccess.Should().BeTrue();
        FullName.Create(new string('a', FullName.MaxLength)).IsSuccess.Should().BeTrue();
        FullName.Create(" " + new string('a', FullName.MaxLength) + " ").IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void BlankIsAbsent_IsFalse_BecauseABlankNameIsAMistake()
    {
        FullName.BlankIsAbsent.Should().BeFalse();
    }

    [Fact]
    public void Restore_AcceptsANameThatCreateWouldReject()
    {
        FullName.Restore("A").Value.Should().Be("A");
    }

    [Fact]
    public void Equality_ComparesTheValue()
    {
        FullName.Create("Maria Souza").Value.Should().Be(FullName.Create(" Maria Souza ").Value);
    }
}
