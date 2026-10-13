using Admin.SharedKernel;
using ServicesService.Application.Clients;

namespace ServicesService.Tests.Clients;

public class ClientListFilterTests
{
    [Fact]
    public void ThePageIsKeptAndItsOffsetIsExposed()
    {
        var filter = new ClientListFilter(3, 50, null, null, null);

        filter.Page.Should().Be(3);
        filter.PageSize.Should().Be(50);
        filter.Offset.Should().Be(100);
        filter.Should().BeAssignableTo<PageRequest>();
    }

    [Theory]
    [InlineData(0, 20)]
    [InlineData(1, 0)]
    [InlineData(21_474_838, 100)]
    public void APageNoRepositoryCouldServe_Throws(int page, int pageSize)
    {
        var act = () => new ClientListFilter(page, pageSize, null, null, null);

        act.Should().Throw<ArgumentOutOfRangeException>();
    }

    [Fact]
    public void TheTextTheCpfDigitsAndTheStatus_AreKeptExactlyAsGiven()
    {
        var cpfDigits = CpfDigits.Create("123");

        var filter = new ClientListFilter(1, 20, " Maria ", cpfDigits, ClientStatus.Inactive);

        filter.Text.Should().Be(" Maria ");
        filter.CpfDigits.Should().BeSameAs(cpfDigits);
        filter.Status.Should().Be(ClientStatus.Inactive);
    }

    [Fact]
    public void TwoFiltersWithTheSameValues_AreEqual()
    {
        var filter = new ClientListFilter(2, 20, "maria", null, ClientStatus.Active);

        filter.Should().Be(new ClientListFilter(2, 20, "maria", null, ClientStatus.Active));
        filter.Should().NotBe(new ClientListFilter(3, 20, "maria", null, ClientStatus.Active));
        filter.Should().NotBe(new ClientListFilter(2, 20, "maria", null, ClientStatus.Inactive));
        filter.Should().NotBe(new ClientListFilter(2, 20, "mario", null, ClientStatus.Active));
        filter.Should().NotBe(new ClientListFilter(2, 20, "maria", CpfDigits.Create("123"), ClientStatus.Active));
        new ClientListFilter(2, 20, "maria", CpfDigits.Create("123"), null).Should()
            .Be(new ClientListFilter(2, 20, "maria", CpfDigits.Create("1.2-3"), null));
    }

    [Fact]
    public void AFilterIsNeverEqualToAPlainRequestOfTheSamePage()
    {
        new ClientListFilter(2, 20, null, null, null).Should().NotBe(new PageRequest(2, 20));
    }
}
