using ServicesService.Domain.Entities;

namespace ServicesService.Application.Services.UpdateService;

public static class UpdateServiceCommandExtensions
{
    public static void ApplyTo(this UpdateServiceCommand command, Service service) =>
        service.Update(
            command.Name,
            command.Description,
            command.DurationMinutes,
            command.MinDurationMinutes,
            command.MaxDurationMinutes,
            command.Price,
            command.MaxDiscountPercentage,
            command.CategoryId);
}
