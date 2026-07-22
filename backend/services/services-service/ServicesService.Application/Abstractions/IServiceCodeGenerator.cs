namespace ServicesService.Application.Abstractions;

public interface IServiceCodeGenerator
{
    Task<int> GetNextCodeAsync(CancellationToken cancellationToken);
}
