using IdentityService.Application.Abstractions;
using IdentityService.Domain.Common;

namespace IdentityService.Tests;

public class DomainErrorMapperTests
{
    [Fact]
    public void ToApplicationError_PreservesCodeAndMessage()
    {
        var domainError = new DomainError("Tenant.Invalid", "O nome do tenant é obrigatório.");

        var error = domainError.ToApplicationError();

        error.Code.Should().Be("Tenant.Invalid");
        error.Message.Should().Be("O nome do tenant é obrigatório.");
    }

    [Fact]
    public void ToApplicationError_MapsToValidationErrorType()
    {
        var domainError = new DomainError("Tenant.Invalid", "O nome do tenant é obrigatório.");

        var error = domainError.ToApplicationError();

        error.Type.Should().Be(Admin.SharedKernel.ErrorType.Validation);
    }
}
