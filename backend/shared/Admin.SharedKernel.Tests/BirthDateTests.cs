using Admin.SharedKernel.ValueObjects;

namespace Admin.SharedKernel.Tests;

public class BirthDateTests
{
    private static readonly DateOnly Today = new(2026, 10, 2);

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
    [InlineData(2015, 3, 10, true)]
    [InlineData(1990, 5, 20, false)]
    [InlineData(2026, 10, 1, true)]
    public void IsMinorOn_IsTrueUntilTheEighteenthBirthday(int year, int month, int day, bool expected)
    {
        BirthDate.Restore(new DateOnly(year, month, day)).IsMinorOn(Today).Should().Be(expected);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(365)]
    public void IsMinorOn_IsFalseForTodayOrTheFuture(int daysAhead)
    {
        BirthDate.Restore(Today.AddDays(daysAhead)).IsMinorOn(Today).Should().BeFalse();
    }

    [Fact]
    public void Create_WithAPastDate_KeepsIt()
    {
        BirthDate.Create(Today.AddDays(-1), Today).Value.Value.Should().Be(Today.AddDays(-1));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(365)]
    public void Create_WithTodayOrFuture_FailsWithThePastMessage(int daysAhead)
    {
        var result = BirthDate.Create(Today.AddDays(daysAhead), Today);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be("A data de nascimento deve estar no passado.");
    }

    [Fact]
    public void Create_WithExactlyOneHundredTwentyYears_Succeeds()
    {
        BirthDate.Create(new DateOnly(1906, 10, 2), Today).IsSuccess.Should().BeTrue();
    }

    [Fact]
    public void Create_WithMoreThanOneHundredTwentyYears_FailsWithTheAgeMessage()
    {
        var result = BirthDate.Create(new DateOnly(1905, 10, 2), Today);

        result.IsFailure.Should().BeTrue();
        result.Error.Should().Be("A data de nascimento não pode indicar idade superior a 120 anos.");
    }

    [Fact]
    public void Create_JudgesTheDateAgainstTheDayItIsGiven()
    {
        var date = new DateOnly(2026, 10, 2);

        BirthDate.Create(date, date.AddDays(1)).IsSuccess.Should().BeTrue();
        BirthDate.Create(date, date).IsFailure.Should().BeTrue();
    }

    [Fact]
    public void Restore_AcceptsADateThatCreateWouldNoLongerAccept()
    {
        var storedLongAgo = new DateOnly(1905, 10, 2);

        BirthDate.Restore(storedLongAgo).Value.Should().Be(storedLongAgo);
    }
}
