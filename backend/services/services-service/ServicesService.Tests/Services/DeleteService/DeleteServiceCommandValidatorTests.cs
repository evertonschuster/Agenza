using ServicesService.Application.Abstractions;
using ServicesService.Application.Services.DeleteService;
using ServicesService.Domain.Entities;

namespace ServicesService.Tests.Services.DeleteService;

public class DeleteServiceCommandValidatorTests
{
    private readonly IServiceRepository _serviceRepository = Substitute.For<IServiceRepository>();
    private readonly DeleteServiceCommandValidator _validator;
    private readonly Guid _serviceId = Guid.NewGuid();

    public DeleteServiceCommandValidatorTests()
    {
        var service = new Service(_serviceId, "Haircut", null, 30, 15, 60, 45.50m, 10m, null, 1);
        _serviceRepository.GetByIdAsync(_serviceId, Arg.Any<CancellationToken>()).Returns(service);
        _validator = new DeleteServiceCommandValidator(_serviceRepository);
    }

    [Fact]
    public async Task Validate_WithExistingService_Passes()
    {
        var result = await _validator.ValidateAsync(new DeleteServiceCommand(_serviceId));

        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task Validate_WithUnknownServiceId_FailsWithNotFoundErrorCode()
    {
        var unknownId = Guid.NewGuid();
        _serviceRepository.GetByIdAsync(unknownId, Arg.Any<CancellationToken>()).Returns((Service?)null);

        var result = await _validator.ValidateAsync(new DeleteServiceCommand(unknownId));

        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.ErrorCode == "Service.NotFound");
    }
}
