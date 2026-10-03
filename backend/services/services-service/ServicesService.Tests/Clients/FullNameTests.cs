using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Clients;

public class FullNameTests
{
    [Fact]
    public void Create_TrimsTheName()
    {
        FullName.Create("  Maria Souza  ").Value.Value.Should().Be("Maria Souza");
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("A")]
    [InlineData(" A ")]
    public void Create_WithMissingOrTooShortName_Fails(string? raw)
    {
        var result = FullName.Create(raw);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Client.Invalid");
    }

    [Fact]
    public void Create_AcceptsNamesBetweenTwoAndOneHundredFiftyCharactersAfterTrim()
    {
        FullName.Create("Jo").IsSuccess.Should().BeTrue();
        FullName.Create(new string('a', FullName.MaxLength)).IsSuccess.Should().BeTrue();
        FullName.Create(" " + new string('a', FullName.MaxLength) + " ").IsSuccess.Should().BeTrue();
        FullName.Create(new string('a', FullName.MaxLength + 1)).IsFailure.Should().BeTrue();
    }

    [Fact]
    public void Equality_ComparesTheValue()
    {
        FullName.Create("Maria Souza").Value.Should().Be(FullName.Create(" Maria Souza ").Value);
    }
}
