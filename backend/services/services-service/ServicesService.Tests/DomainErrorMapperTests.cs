using ServicesService.Application.Abstractions;
using ServicesService.Domain.Common;

namespace ServicesService.Tests;

public class DomainErrorMapperTests
{
    [Fact]
    public void ToApplicationError_PreservesCodeAndMessage()
    {
        var domainError = new DomainError("Tag.Invalid", "O nome da etiqueta é obrigatório.");

        var error = domainError.ToApplicationError();

        error.Code.Should().Be("Tag.Invalid");
        error.Message.Should().Be("O nome da etiqueta é obrigatório.");
    }

    [Fact]
    public void ToApplicationError_MapsToValidationErrorType()
    {
        var domainError = new DomainError("Tag.Invalid", "O nome da etiqueta é obrigatório.");

        var error = domainError.ToApplicationError();

        error.Type.Should().Be(Admin.SharedKernel.ErrorType.Validation);
    }
}
