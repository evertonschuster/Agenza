namespace ServicesService.Application.Abstractions;

public interface ICurrentUserProvider
{
    Guid? UserId { get; }
    string? Username { get; }
    string? Email { get; }
    Guid TenantId { get; }
    string? TenantName { get; }
}
