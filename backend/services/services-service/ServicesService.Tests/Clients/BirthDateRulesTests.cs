using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Clients;

public class BirthDateRulesTests
{
    private static readonly DateOnly Today = ClientTestData.Today;

    [Theory]
    [InlineData(2008, 10, 2, 18)]
    [InlineData(2008, 10, 3, 17)]
    [InlineData(2008, 10, 1, 18)]
    [InlineData(2026, 10, 1, 0)]
    [InlineData(2000, 2, 29, 26)]
    [InlineData(1906, 10, 2, 120)]
    [InlineData(1906, 10, 3, 119)]
    [InlineData(1905, 10, 2, 121)]
    public void AgeOn_CountsCompletedYears(int year, int month, int day, int expectedAge)
    {
        BirthDateRules.AgeOn(new DateOnly(year, month, day), Today).Should().Be(expectedAge);
    }

    [Theory]
    [InlineData(2008, 10, 3, true)]
    [InlineData(2008, 10, 2, false)]
    [InlineData(2026, 10, 1, true)]
    [InlineData(1990, 1, 1, false)]
    public void IsMinorOn_IsTrueUntilTheEighteenthBirthday(int year, int month, int day, bool expected)
    {
        BirthDateRules.IsMinorOn(new DateOnly(year, month, day), Today).Should().Be(expected);
    }

    [Fact]
    public void IsMinorOn_WithAFutureDate_IsFalse()
    {
        BirthDateRules.IsMinorOn(Today.AddDays(1), Today).Should().BeFalse();
    }

    [Fact]
    public void Validate_WithAPastDate_Succeeds()
    {
        BirthDateRules.Validate(Today.AddDays(-1), Today).IsSuccess.Should().BeTrue();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(365)]
    public void Validate_WithTodayOrFuture_Fails(int daysAhead)
    {
        var result = BirthDateRules.Validate(Today.AddDays(daysAhead), Today);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("Client.Invalid");
    }

    [Fact]
    public void Validate_WithExactlyOneHundredTwentyYears_Succeeds()
    {
        BirthDateRules.Validate(new DateOnly(1906, 10, 2), Today).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Validate_WithMoreThanOneHundredTwentyYears_Fails()
    {
        var result = BirthDateRules.Validate(new DateOnly(1905, 10, 2), Today);

        result.IsFailure.Should().BeTrue();
        result.Error.Message.Should().Contain("120");
    }
}
