namespace ServicesService.Application.Services.UpdateService;

public static class UpdateServiceCommandExtensions
{
    public static DomainResult ApplyTo(this UpdateServiceCommand command, Service service)
    {
        var durationResult = DurationRange.Create(command.MinDurationMinutes, command.DurationMinutes, command.MaxDurationMinutes);
        if (durationResult.IsFailure)
        {
            return DomainResult.Failure(durationResult.Error);
        }

        var modalityResult = ServiceModalityMapping.ToModality(command.AttendsInPerson, command.AttendsOnline);
        if (modalityResult.IsFailure)
        {
            return DomainResult.Failure(modalityResult.Error);
        }

        return service.Update(
            command.Name,
            command.Description,
            durationResult.Value,
            command.Price,
            command.MaxDiscountPercentage,
            command.CategoryId,
            modalityResult.Value);
    }
}
