namespace ServicesService.Application.Services;

internal static class ServiceModalityMapping
{
    public static DomainResult<ServiceModality?> ToModality(bool? attendsInPerson, bool? attendsOnline)
    {
        if (attendsInPerson is null && attendsOnline is null)
        {
            return DomainResult.Success<ServiceModality?>(null);
        }

        var result = ServiceModality.Create(attendsInPerson ?? false, attendsOnline ?? false);

        return result.IsFailure
            ? DomainResult.Failure<ServiceModality?>(result.Error)
            : DomainResult.Success<ServiceModality?>(result.Value);
    }
}
