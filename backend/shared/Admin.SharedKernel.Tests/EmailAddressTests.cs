using Admin.SharedKernel.ValueObjects;

namespace Admin.SharedKernel.Tests;

public class EmailAddressTests
{
    private const string InvalidFormat = "Informe um e-mail válido.";
    private const string TooLong = "O e-mail deve ter no máximo 254 caracteres.";

    [Theory]
    [InlineData("maria@example.com", "maria@example.com")]
    [InlineData("  Maria.Souza@Example.COM  ", "maria.souza@example.com")]
    [InlineData("maria+agenda@mail.example.com.br", "maria+agenda@mail.example.com.br")]
    public void Create_TrimsAndLowercases(string raw, string expected)
    {
        var result = EmailAddress.Create(raw);

        result.IsSuccess.Should().BeTrue();
        result.Value.Value.Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("maria")]
    [InlineData("maria@")]
    [InlineData("@example.com")]
    [InlineData("maria@example")]
    [InlineData("maria@@example.com")]
    [InlineData("maria@example..com")]
    [InlineData("maria@.example.com")]
    [InlineData("maria@example.com.")]
    [InlineData("maria souza@example.com")]
    [InlineData("a@b@example.com")]
    public void Create_WithBlankOrInvalidFormat_FailsWithTheFormatMessage(string? raw)
    {
        var result = EmailAddress.Create(raw);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be(InvalidFormat);
    }

    [Fact]
    public void Create_WithMoreThanTheMaximumLength_FailsWithTheLengthMessage()
    {
        var email = new string('a', EmailAddress.MaxLength) + "@example.com";

        EmailAddress.Create(email).Error.Should().Be(TooLong);
    }

    [Fact]
    public void Create_WithOneCharacterOverTheMaximumLength_FailsWithTheLengthMessage()
    {
        var email = new string('a', EmailAddress.MaxLength - "@example.com".Length + 1) + "@example.com";

        email.Length.Should().Be(EmailAddress.MaxLength + 1);
        EmailAddress.Create(email).Error.Should().Be(TooLong);
    }

    [Fact]
    public void Create_WithExactlyTheMaximumLength_Succeeds()
    {
        var email = new string('a', EmailAddress.MaxLength - "@example.com".Length) + "@example.com";

        EmailAddress.Create(email).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Restore_AcceptsAnEmailThatCreateWouldReject()
    {
        EmailAddress.Restore("maria@localhost").Value.Should().Be("maria@localhost");
    }
}
