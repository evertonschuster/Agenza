using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Clients;

public class EmailAddressTests
{
    [Theory]
    [InlineData("maria@example.com", "maria@example.com")]
    [InlineData("  Maria.Souza@Example.COM  ", "maria.souza@example.com")]
    [InlineData("maria+agenda@mail.example.com.br", "maria+agenda@mail.example.com.br")]
    public void Create_TrimsAndLowercases(string raw, string expected)
    {
        var result = EmailAddress.Create(raw);

        result.IsSuccess.Should().BeTrue();
        result.Value!.Value.Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Create_WithBlankValue_ReturnsNull(string? raw)
    {
        var result = EmailAddress.Create(raw);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeNull();
    }

    [Theory]
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
    public void Create_WithInvalidFormat_Fails(string raw)
    {
        var result = EmailAddress.Create(raw);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("EmailAddress.Invalid");
    }

    [Fact]
    public void Create_WithMoreThanTheMaximumLength_Fails()
    {
        var email = new string('a', EmailAddress.MaxLength) + "@example.com";

        EmailAddress.Create(email).IsFailure.Should().BeTrue();
    }

    [Fact]
    public void Restore_AcceptsAnEmailThatCreateWouldReject()
    {
        EmailAddress.Restore("maria@localhost").Value.Should().Be("maria@localhost");
    }
}
