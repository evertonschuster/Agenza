using ServicesService.Application.Services;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services;

public class ServiceStatusNamesTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("all")]
    [InlineData("ALL")]
    [InlineData("active")]
    [InlineData("Inactive")]
    public void IsKnownFilter_AcceptsBlankAllAndEveryStatus(string? name)
    {
        ServiceStatusNames.IsKnownFilter(name).Should().BeTrue();
    }

    [Theory]
    [InlineData("deleted")]
    [InlineData("1")]
    [InlineData("every")]
    public void IsKnownFilter_RejectsAnythingElse(string name)
    {
        ServiceStatusNames.IsKnownFilter(name).Should().BeFalse();
    }

    [Theory]
    [InlineData("active", ServiceStatus.Active)]
    [InlineData(" Inactive ", ServiceStatus.Inactive)]
    public void ToFilter_ReturnsTheStatusOfAStatusName(string name, ServiceStatus expected)
    {
        ServiceStatusNames.ToFilter(name).Should().Be(expected);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("all")]
    public void ToFilter_ForBlankOrAll_AppliesNoFilter(string? name)
    {
        ServiceStatusNames.ToFilter(name).Should().BeNull();
    }

    [Theory]
    [InlineData(ServiceStatus.Active, "active")]
    [InlineData(ServiceStatus.Inactive, "inactive")]
    public void ToName_ReturnsTheCamelCaseWireName(ServiceStatus status, string expected)
    {
        ServiceStatusNames.ToName(status).Should().Be(expected);
    }

    [Fact]
    public void ToName_CoversEveryStatus()
    {
        foreach (var status in Enum.GetValues<ServiceStatus>())
        {
            ServiceStatusNames.ToFilter(ServiceStatusNames.ToName(status)).Should().Be(status);
        }
    }

    [Fact]
    public void UnknownMessage_NamesTheAcceptedValues()
    {
        ServiceStatusNames.UnknownCode.Should().Be("ServiceStatus.Unknown");
        ServiceStatusNames.UnknownMessage.Should().Be("A situação deve ser uma das seguintes: active, inactive, all.");
    }
}
