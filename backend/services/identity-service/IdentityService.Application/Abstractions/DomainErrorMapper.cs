using Admin.SharedKernel;
using IdentityService.Domain.Common;

namespace IdentityService.Application.Abstractions;

public static class DomainErrorMapper
{
    public static Error ToApplicationError(this DomainError error) =>
        Error.Validation(error.Code, error.Message);
}
