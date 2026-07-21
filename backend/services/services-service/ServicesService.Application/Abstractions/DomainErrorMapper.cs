using Admin.SharedKernel;
using ServicesService.Domain.Common;

namespace ServicesService.Application.Abstractions;

public static class DomainErrorMapper
{
    public static Error ToApplicationError(this DomainError error) =>
        Error.Validation(error.Code, error.Message);
}
