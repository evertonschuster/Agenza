using ServicesService.Domain.Entities;
using ServicesService.Domain.Exceptions;

namespace ServicesService.Tests;

public class ServiceOfferingTests
{
    [Fact]
    public void Constructor_WithValidValues_TrimsAndSets()
    {
        var id = Guid.NewGuid();

        var serviceOffering = new ServiceOffering(id, "  Haircut  ", "  A classic cut  ", 30, 45.50m);

        serviceOffering.Id.Should().Be(id);
        serviceOffering.TenantId.Should().Be(Guid.Empty);
        serviceOffering.Name.Should().Be("Haircut");
        serviceOffering.Description.Should().Be("A classic cut");
        serviceOffering.DurationMinutes.Should().Be(30);
        serviceOffering.Price.Should().Be(45.50m);
    }

    [Fact]
    public void AssignTenant_WithValidTenant_SetsTenantId()
    {
        var serviceOffering = new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, 45.50m);
        var tenantId = Guid.NewGuid();

        serviceOffering.AssignTenant(tenantId);

        serviceOffering.TenantId.Should().Be(tenantId);
    }

    [Fact]
    public void AssignTenant_WithEmptyTenant_Throws()
    {
        var serviceOffering = new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, 45.50m);

        var act = () => serviceOffering.AssignTenant(Guid.Empty);

        act.Should().Throw<InvalidServiceOfferingException>();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_WithMissingName_Throws(string name)
    {
        var act = () => new ServiceOffering(Guid.NewGuid(), name, null, 30, 45.50m);

        act.Should().Throw<InvalidServiceOfferingException>();
    }

    [Fact]
    public void Constructor_WithNameOverMaxLength_Throws()
    {
        var name = new string('x', ServiceOffering.NameMaxLength + 1);

        var act = () => new ServiceOffering(Guid.NewGuid(), name, null, 30, 45.50m);

        act.Should().Throw<InvalidServiceOfferingException>();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void Constructor_WithBlankDescription_StoresNull(string? description)
    {
        var serviceOffering = new ServiceOffering(Guid.NewGuid(), "Haircut", description, 30, 45.50m);

        serviceOffering.Description.Should().BeNull();
    }

    [Fact]
    public void Constructor_WithDescriptionOverMaxLength_Throws()
    {
        var description = new string('x', ServiceOffering.DescriptionMaxLength + 1);

        var act = () => new ServiceOffering(Guid.NewGuid(), "Haircut", description, 30, 45.50m);

        act.Should().Throw<InvalidServiceOfferingException>();
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void Constructor_WithNonPositiveDuration_Throws(int durationMinutes)
    {
        var act = () => new ServiceOffering(Guid.NewGuid(), "Haircut", null, durationMinutes, 45.50m);

        act.Should().Throw<InvalidServiceOfferingException>();
    }

    [Fact]
    public void Constructor_WithDurationOverMax_Throws()
    {
        var act = () => new ServiceOffering(
            Guid.NewGuid(), "Haircut", null, ServiceOffering.MaxDurationMinutes + 1, 45.50m);

        act.Should().Throw<InvalidServiceOfferingException>();
    }

    [Fact]
    public void Constructor_WithNegativePrice_Throws()
    {
        var act = () => new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, -0.01m);

        act.Should().Throw<InvalidServiceOfferingException>();
    }

    [Fact]
    public void Update_WithValidValues_ReplacesEveryField()
    {
        var serviceOffering = new ServiceOffering(Guid.NewGuid(), "Haircut", "old", 30, 45.50m);

        serviceOffering.Update("  Deep Tissue Massage  ", null, 60, 90.00m);

        serviceOffering.Name.Should().Be("Deep Tissue Massage");
        serviceOffering.Description.Should().BeNull();
        serviceOffering.DurationMinutes.Should().Be(60);
        serviceOffering.Price.Should().Be(90.00m);
    }

    [Fact]
    public void Update_WithInvalidName_ThrowsAndKeepsState()
    {
        var serviceOffering = new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, 45.50m);

        var act = () => serviceOffering.Update("", null, 30, 45.50m);

        act.Should().Throw<InvalidServiceOfferingException>();
        serviceOffering.Name.Should().Be("Haircut");
    }

    [Fact]
    public void MarkCreated_SetsCreatedAtAndCreatedBy()
    {
        var serviceOffering = new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, 45.50m);
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        serviceOffering.MarkCreated(actorId, now);

        serviceOffering.CreatedAt.Should().Be(now);
        serviceOffering.CreatedBy.Should().Be(actorId);
    }

    [Fact]
    public void MarkDeleted_SetsDeletedAtAndDeletedByAndIsDeleted()
    {
        var serviceOffering = new ServiceOffering(Guid.NewGuid(), "Haircut", null, 30, 45.50m);
        var actorId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        serviceOffering.IsDeleted.Should().BeFalse();

        serviceOffering.MarkDeleted(actorId, now);

        serviceOffering.DeletedAt.Should().Be(now);
        serviceOffering.DeletedBy.Should().Be(actorId);
        serviceOffering.IsDeleted.Should().BeTrue();
    }
}
