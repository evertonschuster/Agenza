using ServicesService.Domain.ValueObjects;

namespace ServicesService.Tests.Clients;

public class BirthDateTests
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
        BirthDate.AgeOn(new DateOnly(year, month, day), Today).Should().Be(expectedAge);
    }

    [Theory]
    [InlineData(2008, 10, 3, true)]
    [InlineData(2008, 10, 2, false)]
    [InlineData(2026, 10, 1, true)]
    [InlineData(1990, 1, 1, false)]
    public void IsMinorOn_IsTrueUntilTheEighteenthBirthday(int year, int month, int day, bool expected)
    {
        BirthDate.IsMinorOn(new DateOnly(year, month, day), Today).Should().Be(expected);
        BirthDate.Restore(new DateOnly(year, month, day)).IsMinorOn(Today).Should().Be(expected);
    }

    [Fact]
    public void IsMinorOn_WithAFutureDate_IsFalse()
    {
        BirthDate.IsMinorOn(Today.AddDays(1), Today).Should().BeFalse();
    }

    [Fact]
    public void Create_WithoutAValue_ReturnsNull()
    {
        var result = BirthDate.Create(null, Today);

        result.IsSuccess.Should().BeTrue();
        result.Value.Should().BeNull();
    }

    [Fact]
    public void Create_WithAPastDate_KeepsIt()
    {
        BirthDate.Create(Today.AddDays(-1), Today).Value!.Value.Should().Be(Today.AddDays(-1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(365)]
    public void Create_WithTodayOrFuture_Fails(int daysAhead)
    {
        var result = BirthDate.Create(Today.AddDays(daysAhead), Today);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("BirthDate.NotInThePast");
        result.Error.Message.Should().Contain("passado");
    }

    [Fact]
    public void Create_WithExactlyOneHundredTwentyYears_Succeeds()
    {
        BirthDate.Create(new DateOnly(1906, 10, 2), Today).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Create_WithMoreThanOneHundredTwentyYears_Fails()
    {
        var result = BirthDate.Create(new DateOnly(1905, 10, 2), Today);

        result.IsFailure.Should().BeTrue();
        result.Error.Code.Should().Be("BirthDate.TooOld");
        result.Error.Message.Should().Contain("120");
    }

    [Fact]
    public void Restore_AcceptsADateThatCreateWouldNoLongerAccept()
    {
        var storedLongAgo = new DateOnly(1905, 10, 2);

        BirthDate.Restore(storedLongAgo).Value.Should().Be(storedLongAgo);
    }
}
