namespace ServicesService.Domain.Common;

public readonly record struct DomainError(string Code, string Message);
