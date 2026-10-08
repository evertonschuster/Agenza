namespace Admin.SharedKernel.Tests;

public class ParseResultTests
{
    [Fact]
    public void Success_ExposesTheValueAndNoError()
    {
        var result = ParseResult<string>.Success("abc");

        result.IsSuccess.Should().BeTrue();
        result.IsFailure.Should().BeFalse();
        result.Value.Should().Be("abc");
        result.Error.Should().BeEmpty();
    }

    [Fact]
    public void Failure_ExposesTheErrorAndRefusesTheValue()
    {
        var result = ParseResult<string>.Failure("Informe três letras.");

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be("Informe três letras.");
        var act = () => result.Value;
        act.Should().Throw<InvalidOperationException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Failure_WithoutAMessage_IsAProgrammerError(string? error)
    {
        var act = () => ParseResult<string>.Failure(error!);

        act.Should().Throw<ArgumentException>();
    }
}
